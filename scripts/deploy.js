// Description:
//   Script for deploying Hash's infrastructure to Rancher
//
// Dependencies:
//   "bluebird": "^3.5.3"
//
// Configuration:
//
// Commands:
//   deploy <github-repository>:<github-commit> at <quay-repository> to workload name <rancher-workload> in (Staging|Production) - Deploys the specified commit to the specified workload at Rancher
//
// Author:
//   caio.elias@hashlab.com.br

const Promise = require("bluebird");
const CheckPermission = require("../helpers/check-permission");
const GitHubHelper = require("../helpers/github");
const RancherHelper = require("../helpers/rancher");
const QuayHelper = require("../helpers/quay");
const RespondToUser = require("../helpers/response");

Promise.config({
  cancellation: true
});

module.exports = function deployScript(robot) {
  robot.respond(
    /deploy ([\w-]+):([a-z0-9]{7,}) at ([\w-]+) to workload (name) ([\w-]+) in (Staging|Production)/i,
    res => {
      const repository = res.match[1];
      const commit = res.match[2].substring(0, 7);
      const quayRepository = res.match[3];
      const workloadType = res.match[4];
      const workload = res.match[5];
      const project = res.match[6];

      const deployPromise = Promise.resolve()
        .tap(checkUserPermission)
        .then(checkRepository)
        .then(checkCommit)
        .then(checkRancherProject)
        .then(checkRancherWorkload)
        .spread(checkQuayRepository)
        .spread(checkQuayImage)
        .spread(deploy)
        .catch(sendError);

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

      function checkRepository() {
        return Promise.resolve()
          .then(check)
          .then(decide);

        function check() {
          return GitHubHelper.checkRepository(robot, res, repository);
        }

        function decide(repo) {
          if (!repo) {
            return abort();
          }
        }
      }

      function checkCommit() {
        return Promise.resolve()
          .then(check)
          .then(decide);

        function check() {
          return GitHubHelper.checkCommit(robot, res, repository, commit);
        }

        function decide(com) {
          if (!com) {
            return abort();
          }
        }
      }

      function checkRancherProject() {
        return Promise.resolve()
          .then(checkProject)
          .then(decide);

        function checkProject() {
          return RancherHelper.checkProject(robot, res, project);
        }

        function decide(proj) {
          if (proj) {
            return proj;
          } else {
            return abort();
          }
        }
      }

      function checkRancherWorkload(proj) {
        return Promise.resolve()
          .then(checkWorkload)
          .then(decide);

        function checkWorkload() {
          return RancherHelper.checkWorkload(
            robot,
            res,
            proj,
            workloadType,
            workload
          );
        }

        function decide(work) {
          if (!work) {
            return abort();
          } else {
            return [proj, work];
          }
        }
      }

      function checkQuayRepository(proj, wrkld) {
        return Promise.resolve()
          .then(checkQuay)
          .then(decide);

        function checkQuay() {
          return QuayHelper.checkRepository(robot, res, quayRepository);
        }

        function decide(repo) {
          if (!repo) {
            return abort();
          } else {
            return [proj, wrkld];
          }
        }
      }

      function checkQuayImage(proj, wrkld) {
        return Promise.resolve()
          .then(checkQuay)
          .then(decide);

        function checkQuay() {
          return QuayHelper.checkImage(robot, res, quayRepository, commit);
        }

        function decide(image) {
          if (!image) {
            return abort();
          } else {
            return [proj, wrkld];
          }
        }
      }

      function deploy(proj, wrkld) {
        return Promise.resolve()
          .then(sendMessage)
          .then(deployImage);

        function sendMessage() {
          return RespondToUser(
            robot,
            res,
            false,
            ":hash_logo: All good to deploy :rocket:",
            "info"
          );
        }

        function deployImage() {
          return RancherHelper.performAction(
            robot,
            res,
            "deploy",
            undefined,
            proj.id,
            project,
            undefined,
            wrkld,
            commit
          );
        }
      }

      function abort() {
        deployPromise.cancel();

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

      return deployPromise;
    }
  );
};
