// Description:
//   Script for deploying Hash's infrastructure to Rancher
//
// Dependencies:
//   "bluebird": "^3.5.3"
//
// Configuration:
//
// Commands:
//   deploy <github-commit> to workload <rancher-workload-name> in (Staging|Production) (dry run) - Deploys the specified commit to the specified workload at Rancher
//
// Author:
//   caio.elias@hashlab.com.br

const Promise = require("bluebird");
const CheckPermission = require("../helpers/check-permission");
const RancherHelper = require("../helpers/rancher");
const QuayHelper = require("../helpers/quay");
const RespondToUser = require("../helpers/response");

Promise.config({
  cancellation: true
});

module.exports = function deployScript(robot) {
  robot.respond(
    /deploy ([a-z0-9]{7,}) to workload ([\w-]+) in (Staging|Production)\s*(dry run)+/i,
    res => {
      const commit = res.match[1].substring(0, 7);
      const workload = res.match[2];
      const project = res.match[3];
      const dryRun = res.match[4];

      const deployPromise = Promise.resolve()
        .tap(checkUserPermission)
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
          return RancherHelper.checkWorkload(robot, res, proj, workload);
        }

        function decide(work) {
          if (!work) {
            return abort();
          } else {
            return [proj, work];
          }
        }
      }

      function checkQuayRepository(proj, workloadData) {
        return Promise.resolve()
          .then(checkQuay)
          .then(decide);

        function checkQuay() {
          return QuayHelper.checkRepository(
            robot,
            res,
            QuayHelper.parseQuayRepository(workloadData.containers[0].image)
          );
        }

        function decide(repo) {
          if (!repo) {
            return abort();
          } else {
            return [proj, workloadData];
          }
        }
      }

      function checkQuayImage(proj, workloadData) {
        return Promise.resolve()
          .then(checkQuay)
          .then(decide);

        function checkQuay() {
          return QuayHelper.checkImage(
            robot,
            res,
            QuayHelper.parseQuayRepository(workloadData.containers[0].image),
            commit
          );
        }

        function decide(image) {
          if (!image) {
            return abort();
          } else {
            return [proj, workloadData];
          }
        }
      }

      function deploy(proj, workloadData) {
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
          if (!dryRun) {
            return RancherHelper.performAction(
              robot,
              res,
              "deploy",
              undefined,
              proj.id,
              project,
              undefined,
              workloadData,
              commit
            );
          }
        }
      }

      function abort() {
        deployPromise.cancel();

        return RespondToUser(robot, res, "", "Aborting execution.", "info");
      }

      function sendError(error) {
        // eslint-disable-next-line promise/no-promise-in-callback
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
