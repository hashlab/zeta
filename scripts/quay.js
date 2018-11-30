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

Promise.config({
  cancellation: true
});

module.exports = function rancherScript(robot) {
  robot.respond(/list (quay|Quay) (repositories|repos)/i, res => {
    const listRepositoriesPromise = Promise.resolve()
      .tap(checkUserPermission)
      .then(listRepositories);

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

    return listRepositoriesPromise;
  });
};
