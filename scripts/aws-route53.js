// Description:
//   Script for managing zones and dns records on AWS Route 53
//
// Dependencies:
//   "ramda": "0.25.0"
//   "axios": "0.16.2"
//   "bluebird": "3.5.1"
//   "aws-sdk": "2.181.0"
//
// Configuration:
//   HUBOT_NAME
//   HUBOT_AWS_REGION
//   HUBOT_AWS_ACCESS_KEY_ID
//   HUBOT_AWS_SECRET_ACCESS_KEY
//
// Commands:
//   hubot route53 zones - Get a list of all zones on AWS Route 53
//   hubot route53 zone <zone-id> - Get details of a zone on AWS Route 53
//   hubot route53 create zone <domain> <is-private> - Create a new zone on AWS Route 53
//   hubot route53 delete zone <zone-id> - Delete a zone on AWS Route 53
//   hubot route53 test <zone-id> <record-name> <record-type> - Get the value returned in response to a DNS request for a record set on AWS Route 53
//   hubot route53 records <zone-id> - Get a list of all record sets in the requested zone on AWS Route 53
//   hubot route53 create record <zone-id> <record-name> <record-type> <field> - Create a new record set on AWS Route 53
//   hubot route53 update record <zone-id> <record-name> <record-type> <field> - Update a record set on AWS Route 53
//   hubot route53 delete record <zone-id> <record-name> <record-type> - Delete a record set on AWS Route 53
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
  apiVersions: { route53: "2013-04-01" }
});

const Route53Client = new AWS.Route53(AWSConfig);

// Public

module.exports = function Route53Script(robot) {
  robot.respond(/route53 zones/i, res => {
    if (!CheckEnv(robot, "HUBOT_AWS_REGION")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_ACCESS_KEY_ID")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_SECRET_ACCESS_KEY")) {
      return null;
    }

    const Route53Promise = Promise.resolve()
      .tap(checkUserPermission)
      .then(getZones)
      .then(respond)
      .catch(ErrorHandler(robot, res, "route53 zones"));

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return Route53Promise.cancel();
          }
          return null;
        });
    }

    function getZones() {
      // eslint-disable-next-line promise/avoid-new
      return new Promise((resolve, reject) => {
        Route53Client.listHostedZones({}, function(err, data) {
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

    return Route53Promise;
  });

  robot.respond(/route53 zone (.*)/i, res => {
    if (!CheckEnv(robot, "HUBOT_AWS_REGION")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_ACCESS_KEY_ID")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_SECRET_ACCESS_KEY")) {
      return null;
    }

    const ZoneId = res.match[1];

    const Route53Promise = Promise.resolve()
      .tap(checkUserPermission)
      .then(getZone)
      .then(respond)
      .catch(ErrorHandler(robot, res, "route53 zone <zone-id>"));

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return Route53Promise.cancel();
          }
          return null;
        });
    }

    function getZone() {
      // eslint-disable-next-line promise/avoid-new
      return new Promise((resolve, reject) => {
        Route53Client.getHostedZone({ Id: ZoneId }, function(err, data) {
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

    return Route53Promise;
  });

  robot.respond(/route53 create zone (.*) (.*)/i, res => {
    if (!CheckEnv(robot, "HUBOT_AWS_REGION")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_ACCESS_KEY_ID")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_SECRET_ACCESS_KEY")) {
      return null;
    }

    const Zone = R.replace(/http:\/\//g, "", res.match[1]);
    const IsPrivate = res.match[2] || "false";

    const Route53Promise = Promise.resolve()
      .tap(checkUserPermission)
      .then(createZone)
      .tap(success)
      .then(respond)
      .catch(
        ErrorHandler(robot, res, "route53 create zone <domain> <is-private>")
      );

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return Route53Promise.cancel();
          }
          return null;
        });
    }

    function createZone() {
      // eslint-disable-next-line promise/avoid-new
      return new Promise((resolve, reject) => {
        Route53Client.createHostedZone(
          {
            CallerReference: UniqueId(),
            Name: Zone,
            HostedZoneConfig: {
              Comment: `HostedZone created by ${
                process.env.HUBOT_NAME
              } on behalf of @${R.pathOr(
                "someone",
                ["message", "user", "name"],
                res
              )}`,
              PrivateZone: Boolean(IsPrivate === "true")
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
        "Zone created successfully.",
        "success"
      );
    }

    function respond(response) {
      return res.send(FormatJSON(response));
    }

    return Route53Promise;
  });

  robot.respond(/route53 delete zone (.*)/i, res => {
    if (!CheckEnv(robot, "HUBOT_AWS_REGION")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_ACCESS_KEY_ID")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_SECRET_ACCESS_KEY")) {
      return null;
    }

    const ZoneId = res.match[1];

    const Route53Promise = Promise.resolve()
      .tap(checkUserPermission)
      .then(deleteZone)
      .tap(success)
      .then(respond)
      .catch(ErrorHandler(robot, res, "route53 delete zone <zone>"));

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return Route53Promise.cancel();
          }
          return null;
        });
    }

    function deleteZone() {
      // eslint-disable-next-line promise/avoid-new
      return new Promise((resolve, reject) => {
        Route53Client.deleteHostedZone({ Id: ZoneId }, function(err, data) {
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
        "Zone deleted successfully.",
        "success"
      );
    }

    function respond(response) {
      return res.send(FormatJSON(response));
    }

    return Route53Promise;
  });

  robot.respond(/route53 test (.*) (.*) (.*)/i, res => {
    if (!CheckEnv(robot, "HUBOT_AWS_REGION")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_ACCESS_KEY_ID")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_SECRET_ACCESS_KEY")) {
      return null;
    }

    const ZoneId = res.match[1];
    const RecordName = R.replace(/http:\/\//g, "", res.match[2]);
    const RecordType = res.match[3];

    const Route53Promise = Promise.resolve()
      .tap(checkUserPermission)
      .then(getTestDNS)
      .then(respond)
      .catch(
        ErrorHandler(
          robot,
          res,
          "route53 test dsn answer <zone-id> <record-name> <record-type>"
        )
      );

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return Route53Promise.cancel();
          }
          return null;
        });
    }

    function getTestDNS() {
      // eslint-disable-next-line promise/avoid-new
      return new Promise((resolve, reject) => {
        Route53Client.testDNSAnswer(
          {
            HostedZoneId: ZoneId,
            RecordName: RecordName,
            RecordType: RecordType
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

    function respond(response) {
      return res.send(FormatJSON(response));
    }

    return Route53Promise;
  });

  robot.respond(/route53 records (.*)/i, res => {
    if (!CheckEnv(robot, "HUBOT_AWS_REGION")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_ACCESS_KEY_ID")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_SECRET_ACCESS_KEY")) {
      return null;
    }

    const ZoneId = res.match[1];

    const Route53Promise = Promise.resolve()
      .tap(checkUserPermission)
      .then(getRecords)
      .then(respond)
      .catch(ErrorHandler(robot, res, "route53 records <zone-id>"));

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return Route53Promise.cancel();
          }
          return null;
        });
    }

    function getRecords() {
      // eslint-disable-next-line promise/avoid-new
      return new Promise((resolve, reject) => {
        Route53Client.listResourceRecordSets({ HostedZoneId: ZoneId }, function(
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
      return res.send(FormatJSON(response, true));
    }

    return Route53Promise;
  });

  robot.respond(/route53 create record (.*) (.*) (.*) (.*)/i, res => {
    if (!CheckEnv(robot, "HUBOT_AWS_REGION")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_ACCESS_KEY_ID")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_SECRET_ACCESS_KEY")) {
      return null;
    }

    const ZoneId = res.match[1];
    const RecordName = R.replace(/http:\/\//g, "", res.match[2]);
    const RecordType = res.match[3];
    const Field = R.replace(/http:\/\//g, "", res.match[4]);

    const Route53Promise = Promise.resolve()
      .tap(checkUserPermission)
      .then(createRecord)
      .tap(success)
      .then(respond)
      .catch(
        ErrorHandler(
          robot,
          res,
          "route53 create record <zone-id> <record-name> <record-type> <field>"
        )
      );

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return Route53Promise.cancel();
          }
          return null;
        });
    }

    function createRecord() {
      const ResourceRecords = R.map(
        answer => ({ Value: R.join(" ", R.split(",", answer)) }),
        R.split("|", Field)
      );

      const Body = {
        ChangeBatch: {
          Changes: [
            {
              Action: "CREATE",
              ResourceRecordSet: {
                Name: RecordName,
                ResourceRecords: ResourceRecords,
                TTL: 300,
                Type: RecordType
              }
            }
          ],
          Comment: `Record Set created by ${
            process.env.HUBOT_NAME
          } on behalf of @${R.pathOr(
            "someone",
            ["message", "user", "name"],
            res
          )}`
        },
        HostedZoneId: ZoneId
      };

      // eslint-disable-next-line promise/avoid-new
      return new Promise((resolve, reject) => {
        Route53Client.changeResourceRecordSets(Body, function(err, data) {
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
        "DNS record created successfully.",
        "success"
      );
    }

    function respond(response) {
      return res.send(FormatJSON(response));
    }

    return Route53Promise;
  });

  robot.respond(/route53 update record (.*) (.*) (.*) (.*)/i, res => {
    if (!CheckEnv(robot, "HUBOT_AWS_REGION")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_ACCESS_KEY_ID")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_SECRET_ACCESS_KEY")) {
      return null;
    }

    const ZoneId = res.match[1];
    const RecordName = R.replace(/http:\/\//g, "", res.match[2]);
    const RecordType = res.match[3];
    const Field = R.replace(/http:\/\//g, "", res.match[4]);

    const Route53Promise = Promise.resolve()
      .tap(checkUserPermission)
      .then(updateRecord)
      .tap(success)
      .then(respond)
      .catch(
        ErrorHandler(
          robot,
          res,
          "route53 update record <zone-id> <record-name> <record-type> <field>"
        )
      );

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return Route53Promise.cancel();
          }
          return null;
        });
    }

    function updateRecord() {
      const ResourceRecords = R.map(
        answer => ({ Value: R.join(" ", R.split(",", answer)) }),
        R.split("|", Field)
      );

      const Body = {
        ChangeBatch: {
          Changes: [
            {
              Action: "UPSERT",
              ResourceRecordSet: {
                Name: RecordName,
                ResourceRecords: ResourceRecords,
                TTL: 300,
                Type: RecordType
              }
            }
          ],
          Comment: `Record Set updated by ${
            process.env.HUBOT_NAME
          } on behalf of @${R.pathOr(
            "someone",
            ["message", "user", "name"],
            res
          )}`
        },
        HostedZoneId: ZoneId
      };

      // eslint-disable-next-line promise/avoid-new
      return new Promise((resolve, reject) => {
        Route53Client.changeResourceRecordSets(Body, function(err, data) {
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
        "DNS record updated successfully.",
        "success"
      );
    }

    function respond(response) {
      return res.send(FormatJSON(response));
    }

    return Route53Promise;
  });

  robot.respond(/route53 delete record (.*) (.*) (.*)/i, res => {
    if (!CheckEnv(robot, "HUBOT_AWS_REGION")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_ACCESS_KEY_ID")) {
      return null;
    }

    if (!CheckEnv(robot, "HUBOT_AWS_SECRET_ACCESS_KEY")) {
      return null;
    }

    const ZoneId = res.match[1];
    const RecordName = R.replace(/http:\/\//g, "", res.match[2]);
    const RecordType = res.match[3];

    const Route53Promise = Promise.resolve()
      .tap(checkUserPermission)
      .then(deleteRecord)
      .tap(success)
      .then(respond)
      .catch(
        ErrorHandler(
          robot,
          res,
          "route53 delete record <zone-id> <record-name> <record-type>"
        )
      );

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return Route53Promise.cancel();
          }
          return null;
        });
    }

    function deleteRecord() {
      const Body = {
        ChangeBatch: {
          Changes: [
            {
              Action: "DELETE",
              ResourceRecordSet: {
                Name: RecordName,
                Type: RecordType
              }
            }
          ]
        },
        HostedZoneId: ZoneId
      };

      // eslint-disable-next-line promise/avoid-new
      return new Promise((resolve, reject) => {
        Route53Client.changeResourceRecordSets(Body, function(err, data) {
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
        "DNS record deleted successfully.",
        "success"
      );
    }

    function respond(response) {
      return res.send(FormatJSON(response));
    }

    return Route53Promise;
  });
};
