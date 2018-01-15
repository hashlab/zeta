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
//   hubot s3 bucket <bucket-name> - Get details of a bucket website on AWS S3
//   hubot s3 enable website for bucket <bucket-name> - Enable static website mode for a bucket on AWS S3
//   hubot s3 set policy for bucket <bucket-name> - Set website policy for a bucket on AWS S3
//   hubot s3 get url for bucket <bucket-name> - Get the url of a bucket website on AWS S3
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
  apiVersions: { s3: "2006-03-01" }
});

const S3Client = new AWS.S3(AWSConfig);

// Public

module.exports = function S3Script(robot) {
  robot.respond(/s3 buckets/i, res => {
    if (!CheckEnv(robot, "HUBOT_AWS_REGION")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_ACCESS_KEY_ID")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_SECRET_ACCESS_KEY")) {
      return null;
    }

    const S3Promise = Promise.resolve()
      .tap(checkUserPermission)
      .then(getBuckets)
      .then(respond)
      .catch(ErrorHandler(robot, res, "s3 buckets"));

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return S3Promise.cancel();
          }
          return null;
        });
    }

    function getBuckets() {
      // eslint-disable-next-line promise/avoid-new
      return new Promise((resolve, reject) => {
        S3Client.listBuckets({}, function(err, data) {
          if (err) {
            return reject(err);
          }

          return resolve(data);
        });
      });
    }

    function respond(response) {
      return res.send(
        FormatJSON(R.pathOr("No buckets!", ["Buckets"], response))
      );
    }

    return S3Promise;
  });

  robot.respond(/s3 create bucket (.*)/i, res => {
    if (!CheckEnv(robot, "HUBOT_AWS_REGION")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_ACCESS_KEY_ID")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_SECRET_ACCESS_KEY")) {
      return null;
    }

    const BucketName = R.replace(/http:\/\//g, "", res.match[1]);

    const S3Promise = Promise.resolve()
      .tap(checkUserPermission)
      .then(createBucket)
      .tap(success)
      .then(respond)
      .catch(ErrorHandler(robot, res, "s3 create bucket <bucket-name>"));

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return S3Promise.cancel();
          }
          return null;
        });
    }

    function createBucket() {
      // eslint-disable-next-line promise/avoid-new
      return new Promise((resolve, reject) => {
        S3Client.createBucket(
          {
            Bucket: BucketName
          },
          function(err, data) {
            if (err) {
              return reject(err);
            }

            return resolve(data);
          }
        );
      });
    }

    function success() {
      return RespondToUser(
        robot,
        res,
        null,
        "Bucket created successfully.",
        "success"
      );
    }

    function respond(response) {
      return res.send(FormatJSON(response));
    }

    return S3Promise;
  });

  robot.respond(/s3 bucket (.*)/i, res => {
    if (!CheckEnv(robot, "HUBOT_AWS_REGION")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_ACCESS_KEY_ID")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_SECRET_ACCESS_KEY")) {
      return null;
    }

    const BucketName = R.replace(/http:\/\//g, "", res.match[1]);

    const S3Promise = Promise.resolve()
      .tap(checkUserPermission)
      .then(getBucketWebsite)
      .then(respond)
      .catch(ErrorHandler(robot, res, "s3 bucket <bucket-name>"));

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return S3Promise.cancel();
          }
          return null;
        });
    }

    function getBucketWebsite() {
      // eslint-disable-next-line promise/avoid-new
      return new Promise((resolve, reject) => {
        S3Client.getBucketWebsite({ Bucket: BucketName }, function(err, data) {
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

    return S3Promise;
  });

  robot.respond(/s3 enable website for bucket (.*)/i, res => {
    if (!CheckEnv(robot, "HUBOT_AWS_REGION")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_ACCESS_KEY_ID")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_SECRET_ACCESS_KEY")) {
      return null;
    }

    const BucketName = R.replace(/http:\/\//g, "", res.match[1]);

    const S3Promise = Promise.resolve()
      .tap(checkUserPermission)
      .then(enableBucketWebsite)
      .tap(success)
      .catch(
        ErrorHandler(robot, res, "s3 enable website for bucket <bucket-name>")
      );

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return S3Promise.cancel();
          }
          return null;
        });
    }

    function enableBucketWebsite() {
      // eslint-disable-next-line promise/avoid-new
      return new Promise((resolve, reject) => {
        S3Client.putBucketWebsite(
          {
            Bucket: BucketName,
            ContentMD5: "",
            WebsiteConfiguration: {
              ErrorDocument: {
                Key: "error.html"
              },
              IndexDocument: {
                Suffix: "index.html"
              }
            }
          },
          function(err, data) {
            if (err) {
              return reject(err);
            }

            return resolve(data);
          }
        );
      });
    }

    function success() {
      return RespondToUser(
        robot,
        res,
        null,
        "Bucket enabled as a website successfully.",
        "success"
      );
    }

    return S3Promise;
  });

  robot.respond(/s3 set policy for bucket (.*)/i, res => {
    if (!CheckEnv(robot, "HUBOT_AWS_REGION")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_ACCESS_KEY_ID")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_SECRET_ACCESS_KEY")) {
      return null;
    }

    const BucketName = R.replace(/http:\/\//g, "", res.match[1]);

    const S3Promise = Promise.resolve()
      .tap(checkUserPermission)
      .then(saveBucketPolicy)
      .tap(success)
      .catch(
        ErrorHandler(robot, res, "s3 set policy for bucket <bucket-name>")
      );

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return S3Promise.cancel();
          }
          return null;
        });
    }

    function saveBucketPolicy() {
      const BucketPolicy = {
        Version: "2008-10-17",
        Statement: [
          {
            Sid: "AllowPublicRead",
            Effect: "Allow",
            Principal: { AWS: "*" },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${BucketName}/*`]
          }
        ]
      };

      // eslint-disable-next-line promise/avoid-new
      return new Promise((resolve, reject) => {
        S3Client.putBucketPolicy(
          {
            Bucket: BucketName,
            Policy: JSON.stringify(BucketPolicy)
          },
          function(err, data) {
            if (err) {
              return reject(err);
            }

            return resolve(data);
          }
        );
      });
    }

    function success() {
      return RespondToUser(
        robot,
        res,
        null,
        "Bucket policy for website saved successfully.",
        "success"
      );
    }

    return S3Promise;
  });

  robot.respond(/s3 get url for bucket (.*)/i, res => {
    if (!CheckEnv(robot, "HUBOT_AWS_REGION")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_ACCESS_KEY_ID")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_SECRET_ACCESS_KEY")) {
      return null;
    }

    const BucketName = R.replace(/http:\/\//g, "", res.match[1]);

    const S3Promise = Promise.resolve()
      .tap(checkUserPermission)
      .then(getBucketUrl)
      .then(respond)
      .catch(ErrorHandler(robot, res, "s3 get url for bucket <bucket-name>"));

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return S3Promise.cancel();
          }
          return null;
        });
    }

    function getBucketUrl() {
      return {
        website_url: `http://${BucketName}.s3-website-${
          process.env.HUBOT_AWS_REGION
        }.amazonaws.com`
      };
    }

    function respond(response) {
      return res.send(FormatJSON(response));
    }

    return S3Promise;
  });
};
