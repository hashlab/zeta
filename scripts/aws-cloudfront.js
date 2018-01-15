// Description:
//   Script for managing distributions on AWS CloudFront
//
// Dependencies:
//   "ramda": "0.25.0"
//   "bluebird": "3.5.1"
//   "aws-sdk": "2.181.0"
//
// Configuration:
//   HUBOT_NAME
//   HUBOT_AWS_REGION
//   HUBOT_AWS_ACCESS_KEY_ID
//   HUBOT_AWS_SECRET_ACCESS_KEY
//   HUBOT_AWS_CLOUDFRONT_BUCKET_LOGS
//   HUBOT_AWS_ACM_CERTIFICATE_ARN
//
// Commands:
//   hubot cloudfront distributions - Get a list of all distributions on AWS CloudFront
//   hubot cloudfront create distribution <bucket-name> - Create a new distribution on AWS CloudFront
//   hubot cloudfront distribution <distribution-id> - Get details of a distribution on AWS CloudFront
//   hubot cloudfront get domain name of distribution <distribution-id> - Get the domain name of a distribution on AWS CloudFront
//
// Author:
//   chris@hashlab.com.br

const R = require("ramda");
const AWS = require("aws-sdk");
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
      return res.send(
        FormatJSON(
          R.map(distribution => {
            return {
              Id: distribution.Id,
              DomainName: distribution.DomainName,
              Status: distribution.Status,
              Comment: distribution.Comment,
              LastModifiedTime: distribution.LastModifiedTime,
              Aliases: R.pathOr([], ["Aliases", "Items"], distribution),
              Origins: R.map(origin => {
                return { Id: origin.Id, DomainName: origin.DomainName };
              }, R.pathOr([], ["Origins", "Items"], distribution))
            };
          }, R.pathOr([], ["DistributionList", "Items"], response))
        )
      );
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

    if (!CheckEnv(robot, "HUBOT_AWS_CLOUDFRONT_BUCKET_LOGS")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_ACM_CERTIFICATE_ARN")) {
      return null;
    }

    const BucketName = R.replace(/http:\/\//g, "", res.match[1]);

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
      const Body = {
        DistributionConfig: {
          CallerReference: UniqueId(),
          Aliases: { Quantity: 1, Items: [BucketName] },
          DefaultRootObject: "index.html",
          Origins: {
            Quantity: 1,
            Items: [
              {
                Id: `S3-Website-${BucketName}.s3-website-${
                  process.env.HUBOT_AWS_REGION
                }.amazonaws.com`,
                DomainName: `${BucketName}.s3-website-${
                  process.env.HUBOT_AWS_REGION
                }.amazonaws.com`,
                OriginPath: "",
                CustomHeaders: { Quantity: 0, Items: [] },
                CustomOriginConfig: {
                  HTTPPort: 80,
                  HTTPSPort: 443,
                  OriginProtocolPolicy: "http-only",
                  OriginSslProtocols: {
                    Quantity: 3,
                    Items: ["TLSv1", "TLSv1.1", "TLSv1.2"]
                  },
                  OriginReadTimeout: 30,
                  OriginKeepaliveTimeout: 5
                }
              }
            ]
          },
          DefaultCacheBehavior: {
            TargetOriginId: `S3-Website-${BucketName}.s3-website-${
              process.env.HUBOT_AWS_REGION
            }.amazonaws.com`,
            ForwardedValues: {
              QueryString: false,
              Cookies: { Forward: "none" },
              Headers: { Quantity: 0, Items: [] },
              QueryStringCacheKeys: { Quantity: 0, Items: [] }
            },
            TrustedSigners: { Enabled: false, Quantity: 0, Items: [] },
            ViewerProtocolPolicy: "redirect-to-https",
            MinTTL: 0,
            AllowedMethods: {
              Quantity: 2,
              Items: ["HEAD", "GET"],
              CachedMethods: { Quantity: 2, Items: ["HEAD", "GET"] }
            },
            SmoothStreaming: false,
            DefaultTTL: 86400,
            MaxTTL: 31536000,
            Compress: true,
            LambdaFunctionAssociations: { Quantity: 0, Items: [] }
          },
          CacheBehaviors: { Quantity: 0, Items: [] },
          CustomErrorResponses: { Quantity: 0, Items: [] },
          Comment: `Distribution created by ${
            process.env.HUBOT_NAME
          } on behalf of @${R.pathOr(
            "someone",
            ["message", "user", "name"],
            res
          )}`,
          Logging: {
            Enabled: true,
            IncludeCookies: false,
            Bucket: process.env.HUBOT_AWS_CLOUDFRONT_BUCKET_LOGS,
            Prefix: "websites/"
          },
          PriceClass: "PriceClass_All",
          Enabled: true,
          ViewerCertificate: {
            ACMCertificateArn: process.env.HUBOT_AWS_ACM_CERTIFICATE_ARN,
            SSLSupportMethod: "sni-only",
            MinimumProtocolVersion: "TLSv1.1_2016",
            Certificate: process.env.HUBOT_AWS_ACM_CERTIFICATE_ARN,
            CertificateSource: "acm"
          },
          Restrictions: {
            GeoRestriction: { RestrictionType: "none", Quantity: 0, Items: [] }
          },
          WebACLId: "",
          HttpVersion: "http2",
          IsIPV6Enabled: true
        }
      };

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
      return res.send(
        FormatJSON({
          Id: response.Id,
          DomainName: response.DomainName,
          Status: response.Status,
          Comment: R.pathOr(
            "No comment!",
            ["DistributionConfig", "Comment"],
            response
          ),
          LastModifiedTime: response.LastModifiedTime,
          Aliases: R.pathOr(
            [],
            ["DistributionConfig", "Aliases", "Items"],
            response
          ),
          Origins: R.map(origin => {
            return { Id: origin.Id, DomainName: origin.DomainName };
          }, R.pathOr([], ["DistributionConfig", "Origins", "Items"], response))
        })
      );
    }

    return CloudFrontPromise;
  });

  robot.respond(/cloudfront get domain name of distribution (.*)/i, res => {
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
      .then(getDistributionDomainName)
      .then(respond)
      .catch(
        ErrorHandler(
          robot,
          res,
          "cloudfront get domain name of distribution <distribution-id>"
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

    function getDistributionDomainName() {
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
      return res.send(
        FormatJSON(R.pathOr("No domain name!", ["DomainName"], response))
      );
    }

    return CloudFrontPromise;
  });
};
