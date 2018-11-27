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

Promise.config({
  cancellation: true
});

exports.checkRepository = function checkRepository(robot, res, repository) {
  if (!CheckEnv(robot, "GITHUB_TOKEN")) {
    return null;
  }

  return Promise.resolve()
    .tap(startCheck)
    .then(checkRepository)
    .then(finishCheck);

  function startCheck() {
    return RespondToUser(
      robot,
      res,
      "",
      `Checking if repository ${repository} exists...`,
      "info"
    );
  }

  function checkRepository() {
    const request = robot
      .http(`https://api.github.com/repos/caio92/${repository}`)
      .header("Authorization", `token ${process.env.GITHUB_TOKEN}`)
      .get();

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

  function finishCheck(repo) {
    return Promise.resolve()
      .then(sendMessage)
      .then(respond);

    function sendMessage() {
      if (R.has("id", repo)) {
        return RespondToUser(
          robot,
          res,
          false,
          `Repository ${repository} exists!`,
          "success"
        );
      } else {
        return RespondToUser(
          robot,
          res,
          false,
          `Sorry, I couldn't find the repository ${repository}`,
          "error"
        );
      }
    }

    function respond() {
      return R.has("id", repo);
    }
  }
};

exports.checkCommit = function checkCommit(robot, res, repository, commit) {
  if (!CheckEnv(robot, "GITHUB_TOKEN")) {
    return null;
  }

  return Promise.resolve()
    .then(startCheck)
    .then(checkCommit)
    .then(finishCheck);

  function startCheck() {
    return RespondToUser(
      robot,
      res,
      false,
      `Checking if commit ${commit} exists...`,
      "info"
    );
  }

  function checkCommit() {
    const request = robot
      .http(
        `https://api.github.com/repos/caio92/${repository}/commits/${commit}`
      )
      .header("Authorization", `token ${process.env.GITHUB_TOKEN}`)
      .get();

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

  function finishCheck(gitHubCommit) {
    return Promise.resolve()
      .then(sendMessage)
      .then(respond);

    function sendMessage() {
      if (R.has("sha", gitHubCommit)) {
        return RespondToUser(
          robot,
          res,
          false,
          `Commit ${commit} exists!`,
          "success"
        );
      } else {
        return RespondToUser(
          robot,
          res,
          false,
          `Sorry, I couldn't find the specified commit ${commit}`,
          "error"
        );
      }
    }

    function respond() {
      return R.has("sha", gitHubCommit);
    }
  }
};
