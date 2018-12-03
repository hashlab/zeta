// Description:
//   Helper to interact with Rancher API
//
// Dependencies:
//   "ramda": "^0.26.0"
//   "bluebird": "^3.5.3"
//   "moment": "^2.22.2"
//
// Configuration:
//   RANCHER_ACCESS_KEY
//   RANCHER_SECRET_KEY
//   RANCHER_API_URL
//
// Author:
//   caio.elias@hashlab.com.br

const R = require("ramda");
const moment = require("moment");
const Promise = require("bluebird");
const CheckEnv = require("../helpers/check-env");
const RespondToUser = require("../helpers/response");

Promise.config({
  cancellation: true
});

exports.performAction = function performAction(
  robot,
  res,
  action,
  workloadId,
  projectId,
  revisionName,
  rollbackType,
  workload,
  commit
) {
  var auth = undefined;

  if (!checkVariables(robot)) {
    return null;
  } else {
    auth = setAuth();
  }

  const actionPromise = Promise.resolve()
    .then(startAction)
    .then(checkRequirements)
    .then(performAction)
    .then(finishAction);

  return actionPromise;

  function startAction() {
    return Promise.resolve()
      .then(sendMessage)
      .then(prepare);

    function sendMessage() {
      return RespondToUser(
        robot,
        res,
        false,
        `*Starting ${action} operation: workload ${workloadId ||
          workload.id} at project ${projectId} to ${revisionName ||
          rollbackType}...*`,
        "info"
      );
    }

    function prepare() {
      if (action === "rollback") {
        if (rollbackType !== "revision") {
          return listRevisions(robot, res, workloadId, projectId, rollbackType);
        } else if (revisionName) {
          return checkRevision(robot, res, workloadId, projectId, revisionName);
        } else {
          return false;
        }
      }
    }
  }

  function checkRequirements(revision) {
    if (action === "rollback") {
      if (!revision || !revision.id) {
        actionPromise.cancel();
      } else {
        return revision;
      }
    } else {
      return {};
    }
  }

  function performAction(revision) {
    let request;

    if (action === "deploy") {
      // I'm assuming the workload only has one container. If the workload has more than one container, this method might not work properly, and here's where to fix it.

      const container = workload.containers[0];
      const newContainerUrl = `${container.image.substring(
        0,
        container.image.length - 7
      )}${commit}`;

      const newContainer = Object.assign(workload.containers[0], {
        image: newContainerUrl
      });

      request = robot
        .http(process.env.RANCHER_API_URL)
        .path(`project/${projectId}/workloads/${workloadId || workload.id}`)
        .header("Authorization", auth)
        .put(
          JSON.stringify({
            containers: [newContainer]
          })
        );
    } else {
      request = robot
        .http(process.env.RANCHER_API_URL)
        .path(`project/${projectId}/workloads/${workloadId || workload.id}`)
        .header("Authorization", auth)
        .query({
          action: action
        })
        .post(
          JSON.stringify({
            replicaSetId: revision.id
          })
        );
    }

    // eslint-disable-next-line promise/avoid-new
    return new Promise((resolve, reject) => {
      request((err, resp) => {
        if (err) {
          reject(err);
        } else {
          resolve(resp.statusCode === 200);
        }
      });
    });
  }

  function finishAction(success) {
    return Promise.resolve().then(sendMessage);

    function sendMessage() {
      if (success) {
        return RespondToUser(
          robot,
          res,
          false,
          `Executed ${action} successfully`,
          "success"
        );
      } else {
        return RespondToUser(
          robot,
          res,
          false,
          `Sorry, I couldn't execute your Rancher action ${action}`,
          "error"
        );
      }
    }
  }
};

exports.listRevisions = listRevisions;

function listRevisions(robot, res, workloadId, projectId, rollbackType) {
  var auth = undefined;

  if (!checkVariables(robot)) {
    return null;
  } else {
    auth = setAuth();
  }

  return Promise.resolve()
    .tap(startListing)
    .then(listRevisions)
    .then(finishListing);

  function startListing() {
    if (!rollbackType) {
      return RespondToUser(
        robot,
        res,
        false,
        `Listing Rancher project ${projectId} workload ${workloadId} revisions...`,
        "info"
      );
    }
  }

  function listRevisions() {
    const request = robot
      .http(process.env.RANCHER_API_URL)
      .path(`projects/${projectId}/workloads/${workloadId}/revisions`)
      .header("Authorization", auth)
      .get();

    // eslint-disable-next-line promise/avoid-new
    return new Promise((resolve, reject) => {
      request((err, resp, body) => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(body));
        }
      });
    });
  }

  function finishListing(response) {
    let latestRev;

    return Promise.resolve()
      .then(sendMessage)
      .then(respond);

    function sendMessage() {
      if (R.has("data", response)) {
        const sortedRevs = R.sort((revision1, revision2) => {
          return revision2.createdTS - revision1.createdTS;
        }, response.data);

        if (rollbackType === "latest") {
          latestRev = sortedRevs[0];
        } else {
          latestRev = sortedRevs[1];
        }

        const reviews = R.map(
          rev => `*${rev.name}:*\n
        _image:_ ${rev.containers[0].image}\n
        _namespaceId:_ ${rev.namespaceId}\n
        _ID:_ ${rev.id}\n
        _Created:_ ${rev.created} (${moment().diff(
            moment(rev.created),
            "days"
          )} days ago)`,
          sortedRevs
        );

        if (!rollbackType) {
          return RespondToUser(
            robot,
            res,
            false,
            reviews.join("\n"),
            "success"
          );
        }
      } else {
        return RespondToUser(
          robot,
          res,
          false,
          "Sorry, I couldn't list your Rancher project's revisions",
          "error"
        );
      }
    }

    function respond() {
      return latestRev;
    }
  }
}

exports.checkRevision = checkRevision;

function checkRevision(robot, res, workloadId, projectId, revisionName) {
  var auth = undefined;

  if (!checkVariables(robot)) {
    return null;
  } else {
    auth = setAuth();
  }

  return Promise.resolve()
    .tap(startCheck)
    .then(checkRevision)
    .then(finishCheck);

  function startCheck() {
    return RespondToUser(
      robot,
      res,
      false,
      `Checking if Rancher revision ${revisionName} exists...`,
      "info"
    );
  }

  function checkRevision() {
    const request = robot
      .http(process.env.RANCHER_API_URL)
      .path(`projects/${projectId}/workloads/${workloadId}/revisions`)
      .query({
        name: revisionName
      })
      .header("Authorization", auth)
      .get();

    // eslint-disable-next-line promise/avoid-new
    return new Promise((resolve, reject) => {
      request((err, resp, body) => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(body));
        }
      });
    });
  }

  function finishCheck(response) {
    let foundRevision;

    return Promise.resolve()
      .then(sendMessage)
      .then(respond);

    function sendMessage() {
      if (R.has("data", response) && response.data.length > 0) {
        foundRevision = response.data.filter(
          revision => revision.name === revisionName
        );
      }

      if (foundRevision.length > 0) {
        foundRevision = foundRevision[0];

        return RespondToUser(
          robot,
          res,
          false,
          `Rancher review ${revisionName} found at project ${projectId}, workload ${workloadId}`,
          "success"
        );
      } else {
        foundRevision = false;

        return RespondToUser(
          robot,
          res,
          false,
          `Sorry, I couldn't find your Rancher revision ${revisionName}`,
          "error"
        );
      }
    }

    function respond() {
      return foundRevision;
    }
  }
}

exports.listProjects = function listProjects(robot, res) {
  var auth = undefined;

  if (!checkVariables(robot)) {
    return null;
  } else {
    auth = setAuth();
  }

  return Promise.resolve()
    .tap(startListing)
    .then(listProjects)
    .then(finishListing);

  function startListing() {
    return RespondToUser(
      robot,
      res,
      false,
      "Listing Rancher projects...",
      "info"
    );
  }

  function listProjects() {
    const request = robot
      .http(process.env.RANCHER_API_URL)
      .path("projects")
      .header("Authorization", auth)
      .get();

    // eslint-disable-next-line promise/avoid-new
    return new Promise((resolve, reject) => {
      request((err, resp, body) => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(body));
        }
      });
    });
  }

  function finishListing(response) {
    return Promise.resolve().then(sendMessage);

    function sendMessage() {
      if (R.has("data", response)) {
        const projects = R.map(
          project => `${project.name}:\n
        *ID:* ${project.id}\n
        _State:_ ${project.state}`,
          response.data
        );

        return RespondToUser(robot, res, false, projects.join("\n"), "success");
      } else {
        return RespondToUser(
          robot,
          res,
          false,
          "Sorry, I couldn't list your Rancher projects",
          "error"
        );
      }
    }
  }
};

exports.checkProject = function checkProject(robot, res, project) {
  var auth = undefined;

  if (!checkVariables(robot)) {
    return null;
  } else {
    auth = setAuth();
  }

  return Promise.resolve()
    .tap(startCheck)
    .then(checkProject)
    .then(finishCheck);

  function startCheck() {
    return RespondToUser(
      robot,
      res,
      false,
      `Checking if Rancher project ${project} exists...`,
      "info"
    );
  }

  function checkProject() {
    const request = robot
      .http(process.env.RANCHER_API_URL)
      .path("projects")
      .query({
        name: project
      })
      .header("Authorization", auth)
      .get();

    // eslint-disable-next-line promise/avoid-new
    return new Promise((resolve, reject) => {
      request((err, resp, body) => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(body).data);
        }
      });
    });
  }

  function finishCheck(response) {
    let proj;

    return Promise.resolve()
      .then(sendMessage)
      .then(respond);

    function sendMessage() {
      if (response.length > 0) {
        proj = response[0];

        return RespondToUser(
          robot,
          res,
          false,
          `Found Rancher project ${project}`,
          "success"
        );
      } else {
        return RespondToUser(
          robot,
          res,
          false,
          `Sorry, I couldn't find your Rancher project ${project}`,
          "error"
        );
      }
    }

    function respond() {
      return proj;
    }
  }
};

exports.listWorkloads = function listWorkloads(robot, res, projectId) {
  var auth = undefined;

  if (!checkVariables(robot)) {
    return null;
  } else {
    auth = setAuth();
  }

  return Promise.resolve()
    .tap(startListing)
    .then(listWorkloads)
    .then(finishListing);

  function startListing() {
    return RespondToUser(
      robot,
      res,
      false,
      `Listing Rancher project ${projectId} workloads...`,
      "info"
    );
  }

  function listWorkloads() {
    const request = robot
      .http(process.env.RANCHER_API_URL)
      .path(`projects/${projectId}/workloads`)
      .header("Authorization", auth)
      .get();

    // eslint-disable-next-line promise/avoid-new
    return new Promise((resolve, reject) => {
      request((err, resp, body) => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(body));
        }
      });
    });
  }

  function finishListing(response) {
    return Promise.resolve().then(sendMessage);

    function sendMessage() {
      if (R.has("data", response)) {
        const workloads = R.map(
          workload =>
            `*${workload.name}:*\n
            _image:_ ${workload.containers[0].image}\n
            _type:_ ${workload.type}\n
            _namespaceId:_ ${workload.namespaceId}\n
            _id:_ ${workload.id}\n`,
          response.data
        );

        return RespondToUser(
          robot,
          res,
          false,
          workloads.join("\n"),
          "success"
        );
      } else {
        return RespondToUser(
          robot,
          res,
          false,
          "Sorry, I couldn't list your Rancher's workloads",
          "error"
        );
      }
    }
  }
};

exports.checkWorkload = function checkWorkload(
  robot,
  res,
  project,
  workloadType,
  workload
) {
  var auth = undefined;

  if (!checkVariables(robot)) {
    return null;
  } else {
    auth = setAuth();
  }

  return Promise.resolve()
    .tap(startCheck)
    .then(checkWorkload)
    .then(finishCheck);

  function startCheck() {
    return RespondToUser(
      robot,
      res,
      false,
      `Checking if Rancher workload ${workload} exists...`,
      "info"
    );
  }

  function checkWorkload() {
    const request = robot
      .http(`${process.env.RANCHER_API_URL}`)
      .path(`projects/${project.id}/workloads`)
      .query({
        [workloadType]: workload
      })
      .header("Authorization", auth)
      .get();

    // eslint-disable-next-line promise/avoid-new
    return new Promise((resolve, reject) => {
      request((err, resp, body) => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(body).data);
        }
      });
    });
  }

  function finishCheck(response) {
    let work;

    return Promise.resolve()
      .then(sendMessage)
      .then(respond);

    function sendMessage() {
      if (response.length > 0) {
        work = response[0];

        return RespondToUser(
          robot,
          res,
          false,
          `Found Rancher project workload ${workload}`,
          "success"
        );
      } else {
        return RespondToUser(
          robot,
          res,
          false,
          `Sorry, I couldn't find your Rancher project ${
            project.id
          } workload ${workload}`,
          "error"
        );
      }
    }

    function respond() {
      return work;
    }
  }
};

function checkVariables(robot) {
  return !(
    !CheckEnv(robot, "RANCHER_ACCESS_KEY") ||
    !CheckEnv(robot, "RANCHER_SECRET_KEY") ||
    !CheckEnv(robot, "RANCHER_API_URL")
  );
}

function setAuth() {
  return (
    "Basic " +
    Buffer.from(
      `${process.env.RANCHER_ACCESS_KEY}:${process.env.RANCHER_SECRET_KEY}`
    ).toString("base64")
  );
}
