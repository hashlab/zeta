// Description:
//   Script for managing Quay repositories and tags
//
// Dependencies:
//   "ramda": "^0.26.0"
//   "bluebird": "^3.5.3"
//
// Configuration:
//
// Commands:
//   list (quay|Quay) (repositories|repos) - Get a list of all Hash's Quay repositories
//
// Author:
//   caio.elias@hashlab.com.br

const Promise = require("bluebird");
const CheckPermission = require("../helpers/check-permission");
const QuayHelper = require("../helpers/quay");
const RespondToUser = require("../helpers/response");

Promise.config({
  cancellation: true
});

module.exports = function rancherScript(robot) {
  robot.respond(/list (quay|Quay) (repositories|repos)/i, res => {
    const listRepositoriesPromise = Promise.resolve()
      .tap(checkUserPermission)
      .then(listRepositories)
      .catch(sendError);

    function checkUserPermission() {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap(hasPermission => {
          if (!hasPermission) {
            return listRepositoriesPromise.cancel();
          }
          return null;
        });
    }

    function listRepositories() {
      return QuayHelper.listRepositories(robot, res);
    }

    function abort() {
      listRepositoriesPromise.cancel();

      return RespondToUser(robot, res, "", "Aborting execution.", "info");
    }

    function sendError(error) {
      return Promise.resolve()
        .then(sendMessage)
        .then(abort);

      function sendMessage() {
        return RespondToUser(robot, res, error);
      }
    }

    return listRepositoriesPromise;
  });
};
