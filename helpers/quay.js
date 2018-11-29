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
const CheckEnv = require("./check-env");
const RespondToUser = require("./response");

const quayApiUrl = "https://quay.io/api/v1";

Promise.config({
  cancellation: true
});

exports.checkImage = function checkImage(robot, res, quayRepository, commit) {
  if (!CheckEnv(robot, "QUAY_TOKEN")) {
    return null;
  }

  return Promise.resolve()
    .tap(startCheck)
    .then(checkTags)
    .then(finishCheck);

  function startCheck() {
    return RespondToUser(
      robot,
      res,
      "",
      `Checking Quay if corresponding image exists...`,
      "info"
    );
  }

  function checkTags() {
    const request = robot
      .http(`${quayApiUrl}/repository/hashlab/${quayRepository}/tag`)
      .query({
        specificTag: commit,
        onlyActiveTags: true
      })
      .header("Authorization", `Bearer ${process.env.QUAY_TOKEN}`)
      .get();

    // eslint-disable-next-line promise/avoid-new
    return new Promise((resolve, reject) => {
      request((err, resp, body) => {
        if (
          resp.statusCode >= 300 &&
          resp.statusCode < 400 &&
          R.has("location", resp.headers)
        ) {
          const redirectRequest = robot
            .http(resp.headers.location)
            .header("Authorization", `Bearer ${process.env.QUAY_TOKEN}`)
            .get();
          resolve(
            // eslint-disable-next-line promise/avoid-new
            new Promise((resolve, reject) => {
              redirectRequest((err, resp, body) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(JSON.parse(body).tags);
                }
              });
            })
          );
        }
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(body).tags);
        }
      });
    });
  }

  function finishCheck(response) {
    return Promise.resolve()
      .then(sendMessage)
      .then(respond);

    function sendMessage() {
      if (
        response.length > 0 &&
        response.findIndex(tag => tag.name === commit) > -1
      ) {
        return RespondToUser(
          robot,
          res,
          false,
          `Found image ${commit} at Quay`,
          "success"
        );
      } else {
        return RespondToUser(
          robot,
          res,
          false,
          `Sorry, I couldn't find image ${commit} at Quay`,
          "error"
        );
      }
    }

    function respond() {
      return response.length > 0;
    }
  }
};

exports.checkRepository = function checkRepository(robot, res, quayRepository) {
  if (!CheckEnv(robot, "QUAY_TOKEN")) {
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
      `Checking Quay if repository exists...`,
      "info"
    );
  }

  function checkRepository() {
    const request = robot
      .http(`${quayApiUrl}/repository/hashlab/${quayRepository}`)
      .header("Authorization", `Bearer ${process.env.QUAY_TOKEN}`)
      .get();

    // eslint-disable-next-line promise/avoid-new
    return new Promise((resolve, reject) => {
      request((err, resp, body) => {
        if (
          resp.statusCode >= 300 &&
          resp.statusCode < 400 &&
          R.has("location", resp.headers)
        ) {
          const redirectRequest = robot
            .http(resp.headers.location)
            .header("Authorization", `Bearer ${process.env.QUAY_TOKEN}`)
            .get();
          resolve(
            // eslint-disable-next-line promise/avoid-new
            new Promise((resolve, reject) => {
              redirectRequest((err, resp, body) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(JSON.parse(body).tags);
                }
              });
            })
          );
        }
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(body));
        }
      });
    });
  }

  function finishCheck(response) {
    return Promise.resolve()
      .then(sendMessage)
      .then(respond);

    function sendMessage() {
      if (R.has("name", response) && response.name === quayRepository) {
        return RespondToUser(
          robot,
          res,
          false,
          `Found Quay repository ${quayRepository}`,
          "success"
        );
      } else {
        return RespondToUser(
          robot,
          res,
          false,
          `Sorry, I couldn't find Quay repository ${quayRepository}`,
          "error"
        );
      }
    }

    function respond() {
      return response.name === quayRepository;
    }
  }
};

exports.listRepositories = function listRepositories(robot, res) {
  if (!CheckEnv(robot, "QUAY_TOKEN")) {
    return null;
  }

  return Promise.resolve()
    .tap(startList)
    .then(listRepositories)
    .then(finishList);

  function startList() {
    return RespondToUser(
      robot,
      res,
      "",
      "Listing Quay repositories...",
      "info"
    );
  }

  function listRepositories() {
    const request = robot
      .http(`${quayApiUrl}/repository`)
      .header("Authorization", `Bearer ${process.env.QUAY_TOKEN}`)
      .query({
        namespace: "hashlab"
      })
      .get();

    // eslint-disable-next-line promise/avoid-new
    return new Promise((resolve, reject) => {
      request((err, resp, body) => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(body).repositories);
        }
      });
    });
  }

  function finishList(response) {
    return Promise.resolve().then(sendMessage);

    function sendMessage() {
      if (response.length > 0) {
        const repositories = R.map(
          repo => `*${repo.name}:* ${repo.description}`,
          response
        );

        return RespondToUser(
          robot,
          res,
          false,
          `${repositories.join("\n")}`,
          "success"
        );
      } else {
        return RespondToUser(
          robot,
          res,
          false,
          "Sorry, I couldn't list Quay repositories",
          "error"
        );
      }
    }
  }
};
