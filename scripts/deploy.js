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
const UniqueId = require("../helpers/unique-id");
const FormatJSON = require("../helpers/format-json");
const RespondToUser = require("../helpers/response");
const ErrorHandler = require("../helpers/error-handler");
const CheckPermission = require("../helpers/check-permission");

Promise.config({
  cancellation: true
});

module.exports = function deployScript(robot) {
  robot.respond(/show/i, res => {
    const deployPromise = Promise.resolve()
      .tap(checkUserPermission)
      .then(respond)
      .catch(ErrorHandler(robot, res, "deploy"));

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return deployPromise.cancel();
          }
          return null;
        });
    }

    function respond() {
      return res.send(FormatJSON("Show"));
    }

    return deployPromise;
  });
};
