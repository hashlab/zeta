// Description:
//   Script for managing Github repositories and commits
//
// Dependencies:
//   "bluebird": "^3.5.3"
//
// Configuration:
//
// Commands:
//   list (github|Github) (repositories|repos) - Get a list of Hash's repositories on Github
//   list (github|Github) <repository> commits - Get a commits list of Hash's specified repository on Github
//
// Author:
//   caio.elias@hashlab.com.br

const Promise = require("bluebird");
const CheckPermission = require("../helpers/check-permission");
const GithubHelper = require("../helpers/github");

Promise.config({
  cancellation: true
});

module.exports = function rancherScript(robot) {
  robot.respond(/list (github|Github) (repositories|repos)/i, res => {
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
      return GithubHelper.listRepositories(robot, res);
    }

    return listRepositoriesPromise;
  });

  robot.respond(/list (github|Github) ([\w-]+) commits/i, res => {
    const repository = res.match[2];

    const listRepositoriesPromise = Promise.resolve()
      .tap(checkUserPermission)
      .then(listCommits);

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

    function listCommits() {
      return GithubHelper.listCommits(robot, res, repository);
    }

    return listRepositoriesPromise;
  });
};
