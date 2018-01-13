// Description:
//   Script for managing distributions on AWS CloudFront
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
//   hubot cloudfront distributions - Get a list of all distributions on AWS CloudFront
//   hubot cloudfront create bucket <bucket-name> - Create a new distribution on AWS CloudFront
//   hubot cloudfront distribution <bucket-name> - Get details of a distribution on AWS CloudFront
//   hubot cloudfront delete distribution <bucket-name> - Delete a distribution on AWS CloudFront
//
// Author:
//   chris@hashlab.com.br

const R = require("ramda");
const AWS = require("aws-sdk");
const Promise = require("bluebird");
const CheckEnv = require("../helpers/check-env");
const FormatJSON = require("../helpers/format-json");
const RespondToUser = require("../helpers/response");
const ErrorHandler = require("../helpers/error-handler");
const CheckPermission = require("../helpers/check-permission");

Promise.config({
  cancellation: true
});

// Private
const AWSCredentials = new AWS.Credentials(
  process.env.HUBOT_AWS_ACCESS_KEY_ID,
  process.env.HUBOT_AWS_SECRET_ACCESS_KEY
);

const AWSConfig = new AWS.Config({
  credentials: AWSCredentials,
  region: process.env.HUBOT_AWS_REGION,
  apiVersions: { cloudfront: "2017-03-25" }
});

const CloudFrontClient = new AWS.CloudFront(AWSConfig);

// Public

module.exports = function CloudFrontScript(robot) {
  robot.respond(/cloudfront distributions/i, res => {
    if (!CheckEnv(robot, "HUBOT_AWS_REGION")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_ACCESS_KEY_ID")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_SECRET_ACCESS_KEY")) {
      return null;
    }

    const CloudFrontPromise = Promise.resolve()
      .tap(checkUserPermission)
      .then(getDistributions)
      .then(respond)
      .catch(ErrorHandler(robot, res, "cloudfront distributions"));

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return CloudFrontPromise.cancel();
          }
          return null;
        });
    }

    function getDistributions() {
      // eslint-disable-next-line promise/avoid-new
      return new Promise((resolve, reject) => {
        CloudFrontClient.listDistributions({}, function(err, data) {
          if (err) {
            return reject(err);
          }

          return resolve(data);
        });
      });
    }

    function respond(response) {
      return res.send(FormatJSON(response));
    }

    return CloudFrontPromise;
  });

  robot.respond(/cloudfront create distribution (.*)/i, res => {
    if (!CheckEnv(robot, "HUBOT_AWS_REGION")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_ACCESS_KEY_ID")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_SECRET_ACCESS_KEY")) {
      return null;
    }

    const DistributionId = res.match[1];

    const CloudFrontPromise = Promise.resolve()
      .tap(checkUserPermission)
      .then(createDistribution)
      .tap(success)
      .then(respond)
      .catch(
        ErrorHandler(
          robot,
          res,
          "cloudfront create distribution <distribution-id>"
        )
      );

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return CloudFrontPromise.cancel();
          }
          return null;
        });
    }

    function createDistribution() {
      const Body = {};

      // eslint-disable-next-line promise/avoid-new
      return new Promise((resolve, reject) => {
        CloudFrontClient.createDistribution(Body, function(err, data) {
          if (err) {
            return reject(err);
          }

          return resolve(data);
        });
      });
    }

    function success() {
      return RespondToUser(
        robot,
        res,
        null,
        "Distribution created successfully.",
        "success"
      );
    }

    function respond(response) {
      return res.send(FormatJSON(response));
    }

    return CloudFrontPromise;
  });

  robot.respond(/cloudfront distribution (.*)/i, res => {
    if (!CheckEnv(robot, "HUBOT_AWS_REGION")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_ACCESS_KEY_ID")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_SECRET_ACCESS_KEY")) {
      return null;
    }

    const DistributionId = res.match[1];

    const CloudFrontPromise = Promise.resolve()
      .tap(checkUserPermission)
      .then(getDistribution)
      .then(respond)
      .catch(
        ErrorHandler(robot, res, "cloudfront distribution <distribution-id>")
      );

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return CloudFrontPromise.cancel();
          }
          return null;
        });
    }

    function getDistribution() {
      // eslint-disable-next-line promise/avoid-new
      return new Promise((resolve, reject) => {
        CloudFrontClient.getDistribution({ Id: DistributionId }, function(
          err,
          data
        ) {
          if (err) {
            return reject(err);
          }

          return resolve(data);
        });
      });
    }

    function respond(response) {
      return res.send(FormatJSON(response));
    }

    return CloudFrontPromise;
  });

  robot.respond(/cloudfront delete distribution (.*)/i, res => {
    if (!CheckEnv(robot, "HUBOT_AWS_REGION")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_ACCESS_KEY_ID")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_SECRET_ACCESS_KEY")) {
      return null;
    }

    const DistributionId = res.match[1];

    const CloudFrontPromise = Promise.resolve()
      .tap(checkUserPermission)
      .then(deleteBucket)
      .tap(success)
      .then(respond)
      .catch(
        ErrorHandler(
          robot,
          res,
          "cloudfront delete distribution <distribution-id>"
        )
      );

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return CloudFrontPromise.cancel();
          }
          return null;
        });
    }

    function deleteBucket() {
      // eslint-disable-next-line promise/avoid-new
      return new Promise((resolve, reject) => {
        CloudFrontClient.deleteDistribution({ Id: DistributionId }, function(
          err,
          data
        ) {
          if (err) {
            return reject(err);
          }

          return resolve(data);
        });
      });
    }

    function success() {
      return RespondToUser(
        robot,
        res,
        null,
        "Distribution deleted successfully.",
        "success"
      );
    }

    function respond(response) {
      return res.send(FormatJSON(response));
    }

    return CloudFrontPromise;
  });
};
