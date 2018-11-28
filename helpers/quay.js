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

const Promise = require("bluebird");
const CheckEnv = require("./check-env");
const RespondToUser = require("./response");

const quayApiUrl = "https://quay.io/api/v1";

Promise.config({
  cancellation: true
});

exports.checkImage = function checkImage(
  robot,
  res,
  quayRepository,
  commit = "7c05f2d"
) {
  if (!CheckEnv(robot, "QUAY_TOKEN")) {
    return null;
  }

  return Promise.resolve()
    .tap(startCheck)
    .then(checkImage)
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

  function checkImage() {
    console.log(quayRepository)
    console.log(commit)
    const request = robot
      .http(
        `${quayApiUrl}/repository/hashlab/${quayRepository}/tag?onlyActiveTags=true&specificTag=${commit}`
      )
      .header("Authorization", `Bearer ${process.env.QUAY_TOKEN}`)
      .header("Content-Type", "application/json")
      .get();

    // eslint-disable-next-line promise/avoid-new
    return new Promise((resolve, reject) => {
      request((err, resp, body) => {
        console.log(resp)
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
      if (response.length > 0) {
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
