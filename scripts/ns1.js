// Description:
//   Script for managing zones and dns records on NS1
//
// Dependencies:
//   "ramda": "0.25.0"
//   "axios": "0.16.2"
//   "bluebird": "3.5.1"
//
// Configuration:
//   HUBOT_NSONE_KEY
//
// Commands:
//   hubot ns1 zones - Get a list of all zones on NS1
//   hubot ns1 zone <zone> - Get details of a zone on NS1
//   hubot ns1 create zone <zone> - Create a new zone on NS1
//   hubot ns1 delete zone <zone> - Delete a zone on NS1
//   hubot ns1 record <zone> <domain> <type> - Get details of a dns record on NS1
//   hubot ns1 create record <zone> <domain> <type> <field> - Create a new dns record on NS1
//   hubot ns1 update record <zone> <domain> <type> <field> - Update a dns record on NS1
//   hubot ns1 delete record <zone> <domain> <type> - Delete a dns record on NS1
//
// Author:
//   chris@hashlab.com.br

const R = require("ramda");
const Request = require("axios");
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

const Opts = {
  baseURL: "https://api.nsone.net/v1",
  headers: {
    common: {
      "X-NSONE-Key": process.env.HUBOT_NSONE_KEY,
      "Content-Type": "application/json"
    }
  }
};

const NS1Client = Request.create(Opts);

// Public

module.exports = function NS1Script(robot) {
  robot.respond(/ns1 zones/i, res => {
    if (!CheckEnv(robot, "HUBOT_NSONE_KEY")) {
      return null;
    }

    const NS1Promise = Promise.resolve()
      .tap(checkUserPermission)
      .then(getZones)
      .then(respond)
      .catch(ErrorHandler(robot, res, "ns1 zones"));

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return NS1Promise.cancel();
          }
          return null;
        });
    }

    function getZones() {
      return NS1Client.get("/zones");
    }

    function respond(response) {
      return res.send(FormatJSON(response.data));
    }

    return NS1Promise;
  });

  robot.respond(/ns1 zone (.*)/i, res => {
    if (!CheckEnv(robot, "HUBOT_NSONE_KEY")) {
      return null;
    }

    const Zone = R.replace(/http:\/\//g, "", res.match[1]);

    const NS1Promise = Promise.resolve()
      .tap(checkUserPermission)
      .then(getZone)
      .then(respond)
      .catch(ErrorHandler(robot, res, "ns1 zone <zone>"));

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return NS1Promise.cancel();
          }
          return null;
        });
    }

    function getZone() {
      return NS1Client.get(`/zones/${Zone}`);
    }

    function respond(response) {
      return res.send(FormatJSON(response.data));
    }

    return NS1Promise;
  });

  robot.respond(/ns1 create zone (.*)/i, res => {
    if (!CheckEnv(robot, "HUBOT_NSONE_KEY")) {
      return null;
    }

    const Zone = R.replace(/http:\/\//g, "", res.match[1]);

    const NS1Promise = Promise.resolve()
      .tap(checkUserPermission)
      .then(createZone)
      .tap(success)
      .then(respond)
      .catch(ErrorHandler(robot, res, "ns1 create zone <zone>"));

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return NS1Promise.cancel();
          }
          return null;
        });
    }

    function createZone() {
      return NS1Client.put(`/zones/${Zone}`, { zone: Zone });
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
      return res.send(FormatJSON(response.data));
    }

    return NS1Promise;
  });

  robot.respond(/ns1 delete zone (.*)/i, res => {
    if (!CheckEnv(robot, "HUBOT_NSONE_KEY")) {
      return null;
    }

    const Zone = R.replace(/http:\/\//g, "", res.match[1]);

    const NS1Promise = Promise.resolve()
      .tap(checkUserPermission)
      .then(deleteZone)
      .tap(success)
      .catch(ErrorHandler(robot, res, "ns1 delete zone <zone>"));

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return NS1Promise.cancel();
          }
          return null;
        });
    }

    function deleteZone() {
      return NS1Client.delete(`/zones/${Zone}`);
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

    return NS1Promise;
  });

  robot.respond(/ns1 record (.*) (.*) (.*)/i, res => {
    if (!CheckEnv(robot, "HUBOT_NSONE_KEY")) {
      return null;
    }

    const Zone = R.replace(/http:\/\//g, "", res.match[1]);
    const Domain = R.replace(/http:\/\//g, "", res.match[2]);
    const Type = res.match[3];

    const NS1Promise = Promise.resolve()
      .tap(checkUserPermission)
      .then(getRecord)
      .then(respond)
      .catch(ErrorHandler(robot, res, "ns1 record <zone> <domain> <type>"));

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return NS1Promise.cancel();
          }
          return null;
        });
    }

    function getRecord() {
      return NS1Client.get(`/zones/${Zone}/${Domain}/${Type}`);
    }

    function respond(response) {
      return res.send(FormatJSON(response.data));
    }

    return NS1Promise;
  });

  robot.respond(/ns1 create record (.*) (.*) (.*) (.*)/i, res => {
    if (!CheckEnv(robot, "HUBOT_NSONE_KEY")) {
      return null;
    }

    const Zone = R.replace(/http:\/\//g, "", res.match[1]);
    const Domain = R.replace(/http:\/\//g, "", res.match[2]);
    const Type = res.match[3];
    const Field = R.replace(/http:\/\//g, "", res.match[4]);

    const NS1Promise = Promise.resolve()
      .tap(checkUserPermission)
      .then(createRecord)
      .tap(success)
      .then(respond)
      .catch(
        ErrorHandler(
          robot,
          res,
          "ns1 create record <zone> <domain> <type> <field>"
        )
      );

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return NS1Promise.cancel();
          }
          return null;
        });
    }

    function createRecord() {
      const Answers = R.map(
        answer => ({ answer: R.split(",", answer) }),
        R.split("|", Field)
      );

      const Body = {
        zone: Zone,
        domain: Domain,
        type: Type,
        answers: Answers
      };

      return NS1Client.put(`/zones/${Zone}/${Domain}/${Type}`, Body);
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
      return res.send(FormatJSON(response.data));
    }

    return NS1Promise;
  });

  robot.respond(/ns1 update record (.*) (.*) (.*) (.*)/i, res => {
    if (!CheckEnv(robot, "HUBOT_NSONE_KEY")) {
      return null;
    }

    const Zone = R.replace(/http:\/\//g, "", res.match[1]);
    const Domain = R.replace(/http:\/\//g, "", res.match[2]);
    const Type = res.match[3];
    const Field = R.replace(/http:\/\//g, "", res.match[4]);

    const NS1Promise = Promise.resolve()
      .tap(checkUserPermission)
      .then(updateRecord)
      .tap(success)
      .then(respond)
      .catch(
        ErrorHandler(
          robot,
          res,
          "ns1 update record <zone> <domain> <type> <field>"
        )
      );

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return NS1Promise.cancel();
          }
          return null;
        });
    }

    function updateRecord() {
      const Answers = R.map(
        answer => ({ answer: R.split(",", answer) }),
        R.split("|", Field)
      );

      const Body = {
        answers: Answers
      };

      return NS1Client.post(`/zones/${Zone}/${Domain}/${Type}`, Body);
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
      return res.send(FormatJSON(response.data));
    }

    return NS1Promise;
  });

  robot.respond(/ns1 delete record (.*) (.*) (.*)/i, res => {
    if (!CheckEnv(robot, "HUBOT_NSONE_KEY")) {
      return null;
    }

    const Zone = R.replace(/http:\/\//g, "", res.match[1]);
    const Domain = R.replace(/http:\/\//g, "", res.match[2]);
    const Type = res.match[3];

    const NS1Promise = Promise.resolve()
      .tap(checkUserPermission)
      .then(deleteRecord)
      .tap(success)
      .catch(
        ErrorHandler(robot, res, "ns1 delete record <zone> <domain> <type>")
      );

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return NS1Promise.cancel();
          }
          return null;
        });
    }

    function deleteRecord() {
      return NS1Client.delete(`/zones/${Zone}/${Domain}/${Type}`);
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

    return NS1Promise;
  });
};
