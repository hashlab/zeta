// Description:
//   Script for managing buckets and policies on AWS S3
//
// Dependencies:
//   "ramda": "0.25.0"
//   "axios": "0.16.2"
//   "bluebird": "3.5.1"
//   "aws-sdk": "2.181.0"
//
// Configuration:
//   HUBOT_AWS_REGION
//   HUBOT_AWS_ACCESS_KEY_ID
//   HUBOT_AWS_SECRET_ACCESS_KEY
//
// Commands:
//   hubot s3 buckets - Get a list of all buckets on AWS S3
//   hubot s3 create bucket <bucket-name> <is-private> - Create a new bucket on AWS S3
//   hubot s3 enable website for bucket <bucket-name> - Enable static website mode for a bucket on AWS S3
//   hubot s3 set policy for bucket <bucket-name> - Set website policy for a bucket on AWS S3
//   hubot s3 get url for bucket <bucket-name> - Get the url of a bucket website on AWS S3
//
// Author:
//   chris@hashlab.com.br

const R = require("ramda");
const Promise = require("bluebird");
const CheckEnv = require("../helpers/check-env");
const RespondToUser = require("../helpers/response");

const rancherApiUrl = "https://controlplane.hashlab.network/v3";

Promise.config({
  cancellation: true
});

exports.listProjects = function listProjects(robot, res) {
  var auth = undefined;

  if (checkVariables(robot)) {
    return null;
  } else {
    auth = setAuth();
  }

  return Promise.resolve()
    .tap(startCheck)
    .then(listProjects)
    .then(finishCheck);

  function startCheck() {
    return RespondToUser(robot, res, "", `Listing rancher projects...`, "info");
  }

  function listProjects() {
    const request = robot
      .http(`${rancherApiUrl}/projects`)
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
    return Promise.resolve().then(sendMessage);

    function sendMessage() {
      if (R.has("data", response)) {
        const projects = R.map(
          project => `*${project.name}*: ${project.id}`,
          response.data
        );

        projects.unshift("*Name*: ID\n");

        return RespondToUser(robot, res, "", projects.join("\n"), "success");
      } else {
        return RespondToUser(
          robot,
          res,
          false,
          `Sorry, I couldn't list your rancher's projects`,
          "error"
        );
      }
    }
  }
};

exports.listWorkloads = function listWorkloads(robot, res, projectId) {
  var auth = undefined;

  if (checkVariables(robot)) {
    return null;
  } else {
    auth = setAuth();
  }

  return Promise.resolve()
    .tap(startCheck)
    .then(listWorkloads)
    .then(finishCheck);

  function startCheck() {
    return RespondToUser(
      robot,
      res,
      "",
      `Listing project ${projectId} workloads...`,
      "info"
    );
  }

  function listWorkloads() {
    const request = robot
      .http(`${rancherApiUrl}/projects/${projectId}/workloads`)
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
    return Promise.resolve().then(sendMessage);

    function sendMessage() {
      if (R.has("data", response)) {
        const workloads = R.map(
          workload =>
            `*${workload.name}*:\n
            _image:_ ${workload.containers[0].image}\n
            _type:_ ${workload.type}\n
            _namespace:_ ${workload.namespaceId}\n
            _id:_ ${workload.id}\n`,
          response.data
        );

        return RespondToUser(robot, res, "", workloads.join("\n"), "success");
      } else {
        return RespondToUser(
          robot,
          res,
          false,
          `Sorry, I couldn't list your rancher's workloads`,
          "error"
        );
      }
    }
  }
};

function checkVariables(robot) {
  return (
    !CheckEnv(robot, "RANCHER_ACCESS_KEY") ||
    !CheckEnv(robot, "RANCHER_SECRET_KEY")
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
