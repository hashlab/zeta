// Description:
//   Helper to interact with Rancher API
//
// Dependencies:
//   "bluebird": "^3.5.3"
//
// Configuration:
//
// Commands:
//   list (rancher|Rancher) projects - Get a list of all Hash's projects on Rancher
//   list (rancher|Rancher) project <rancher-project-id> workloads - Get a workloads list of all specified Hash's project on Rancher
//   (rollback|pause|resume) (rancher|Rancher) project <project-id> workload <workload-id> (revision|latest|previous) <revision-name> - Rollback the specified workload to the corresponding revision. If rolling-back to previous or latest, revision-id is not required. Pause and resume will always execute to current image.
//   list (rancher|Rancher) project <project-id> workload <workload-id> revisions - Get a revisions list of the specified project and workload
//
// Author:
//   caio.elias@hashlab.com.br

const Promise = require("bluebird");
const CheckPermission = require("../helpers/check-permission");
const RancherHelper = require("../helpers/rancher");
const RespondToUser = require("../helpers/response");

Promise.config({
  cancellation: true
});

module.exports = function rancherScript(robot) {
  robot.respond(/list (rancher|Rancher) project ([\w:-]+) workloads/i, res => {
    const projectId = res.match[2];

    const listWorkloadsPromise = Promise.resolve()
      .tap(checkUserPermission)
      .then(listWorkloads)
      .catch(sendError);

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return listWorkloadsPromise.cancel();
          }
          return null;
        });
    }

    function listWorkloads() {
      return RancherHelper.listWorkloads(robot, res, projectId);
    }

    function abort() {
      listWorkloadsPromise.cancel();

      return RespondToUser(robot, res, "", "Aborting execution.", "info");
    }

    function sendError(error) {
      // eslint-disable-next-line promise/no-promise-in-callback
      return Promise.resolve()
        .then(sendMessage)
        .then(abort);

      function sendMessage() {
        return RespondToUser(robot, res, error);
      }
    }

    return listWorkloadsPromise;
  });

  robot.respond(/list (rancher|Rancher) projects/i, res => {
    const listProjectsPromise = Promise.resolve()
      .tap(checkUserPermission)
      .then(listProjects)
      .catch(sendError);

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return listProjectsPromise.cancel();
          }
          return null;
        });
    }

    function listProjects() {
      return RancherHelper.listProjects(robot, res);
    }

    function abort() {
      listProjectsPromise.cancel();

      return RespondToUser(robot, res, "", "Aborting execution.", "info");
    }

    function sendError(error) {
      // eslint-disable-next-line promise/no-promise-in-callback
      return Promise.resolve()
        .then(sendMessage)
        .then(abort);

      function sendMessage() {
        return RespondToUser(robot, res, error);
      }
    }

    return listProjectsPromise;
  });

  robot.respond(
    /(rollback|pause|resume) (rancher|Rancher) project ([\w:-]+) workload ([\w:-]+)\s*(revision|latest|previous)*\s*([\w:-]*)/i,
    res => {
      const action = res.match[1];
      const projectId = res.match[3];
      const workloadId = res.match[4];
      const rollbackType = res.match[5];
      const revisionName = res.match[6];

      const actionPromise = Promise.resolve()
        .tap(checkUserPermission)
        .tap(checkMessage)
        .then(performAction)
        .catch(sendError);

      function checkUserPermission() {
        return Promise.resolve()
          .then(CheckPermission(robot, res))
          .tap(hasPermission => {
            if (!hasPermission) {
              return actionPromise.cancel();
            }
            return null;
          });
      }

      function checkMessage() {
        if (action === "rollback" && revisionName && !rollbackType) {
          throw new Error(
            `It seems that you're trying to rollback to revision ${revisionName} but *revision* keyword is missing. Please make sure you're doing the right operation and try again.`
          );
        }
      }

      function performAction() {
        return RancherHelper.performAction(
          robot,
          res,
          action,
          workloadId,
          projectId,
          revisionName,
          rollbackType
        );
      }

      function abort() {
        actionPromise.cancel();

        return RespondToUser(robot, res, "", "Aborting execution.", "info");
      }

      function sendError(error) {
        // eslint-disable-next-line promise/no-promise-in-callback
        return Promise.resolve()
          .then(sendMessage)
          .then(abort);

        function sendMessage() {
          return RespondToUser(robot, res, error);
        }
      }

      return actionPromise;
    }
  );

  robot.respond(
    /list (rancher|Rancher) project ([\w:-]+) workload ([\w:-]+) revisions/i,
    res => {
      const workloadId = res.match[3];
      const projectId = res.match[2];

      const listRevisionsPromise = Promise.resolve()
        .tap(checkUserPermission)
        .then(listRevisions)
        .catch(sendError);

      function checkUserPermission() {
        return Promise.resolve()
          .then(CheckPermission(robot, res))
          .tap(hasPermission => {
            if (!hasPermission) {
              return listRevisionsPromise.cancel();
            }
            return null;
          });
      }

      function listRevisions() {
        return RancherHelper.listRevisions(robot, res, workloadId, projectId);
      }

      function abort() {
        listRevisionsPromise.cancel();

        return RespondToUser(robot, res, "", "Aborting execution.", "info");
      }

      function sendError(error) {
        // eslint-disable-next-line promise/no-promise-in-callback
        return Promise.resolve()
          .then(sendMessage)
          .then(abort);

        function sendMessage() {
          return RespondToUser(robot, res, error);
        }
      }

      return listRevisionsPromise;
    }
  );
};
