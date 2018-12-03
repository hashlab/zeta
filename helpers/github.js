// Description:
//   Helper to interact with Github API
//
// Dependencies:
//   "ramda": "^0.26.0"
//   "bluebird": "^3.5.3"
//
// Configuration:
//   GITHUB_API_URL
//   GITHUB_TOKEN
//
// Author:
//   caio.elias@hashlab.com.br

const R = require("ramda");
const moment = require("moment");
const Promise = require("bluebird");
const CheckEnv = require("../helpers/check-env");
const RespondToUser = require("../helpers/response");

Promise.config({
  cancellation: true
});

exports.checkRepository = function checkRepository(robot, res, repository) {
  if (!CheckEnv(robot, "GITHUB_TOKEN") || !CheckEnv(robot, "GITHUB_API_URL")) {
    return null;
  }

  return Promise.resolve()
    .tap(startCheck)
    .then(checkRepository)
    .then(finishCheck);

  function startCheck() {
    return RespondToUser(
      robot,
      res,
      false,
      `Checking if repository ${repository} exists...`,
      "info"
    );
    // res.send(`Checking if repository ${repository} exists...`);
  }

  function checkRepository() {
    const request = robot
      .http(process.env.GITHUB_API_URL)
      .path(`repos/hashlab/${repository}`)
      .header("Authorization", `token ${process.env.GITHUB_TOKEN}`)
      .get();

    // eslint-disable-next-line promise/avoid-new
    return new Promise((resolve, reject) => {
      request((err, resp, body) => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(body));
        }
      });
    });
  }

  function finishCheck(repo) {
    return Promise.resolve()
      .then(sendMessage)
      .then(respond);

    function sendMessage() {
      if (R.has("id", repo)) {
        return RespondToUser(
          robot,
          res,
          false,
          `Repository ${repository} exists!`,
          "success"
        );
      } else {
        return RespondToUser(
          robot,
          res,
          false,
          `Sorry, I couldn't find the repository ${repository}`,
          "error"
        );
      }
    }

    function respond() {
      return R.has("id", repo);
    }
  }
};

exports.listRepositories = function listRepositories(robot, res) {
  if (!CheckEnv(robot, "GITHUB_TOKEN") || !CheckEnv(robot, "GITHUB_API_URL")) {
    return null;
  }

  return Promise.resolve()
    .tap(startList)
    .then(listRepositories)
    .then(finishList);

  function startList() {
    return RespondToUser(robot, res, "", "Listing Github repositories...", "info");
  }

  function listRepositories() {
    const request = robot
      .http(process.env.GITHUB_API_URL)
      .path("orgs/hashlab/repos")
      .header("Authorization", `token ${process.env.GITHUB_TOKEN}`)
      .get();

    // eslint-disable-next-line promise/avoid-new
    return new Promise((resolve, reject) => {
      request((err, resp, body) => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(body));
        }
      });
    });
  }

  function finishList(response) {
    return Promise.resolve().then(sendMessage);

    function sendMessage() {
      if (response.message !== "Not Found") {
        const repositories = R.map(
          repo =>
            `*${repo.name}*:\n
            _private:_ ${repo.private}\n
            _open issues:_ ${repo.open_issues_count}\n
            _description:_ ${repo.description}\n`,
          response
        );

        return RespondToUser(
          robot,
          res,
          false,
          repositories.join("\n"),
          "success"
        );
      } else {
        return RespondToUser(
          robot,
          res,
          false,
          "Sorry, I couldn't list your repositories",
          "error"
        );
      }
    }
  }
};

exports.checkCommit = function checkCommit(robot, res, repository, commit) {
  if (!CheckEnv(robot, "GITHUB_TOKEN") || !CheckEnv(robot, "GITHUB_API_URL")) {
    return null;
  }

  return Promise.resolve()
    .then(startCheck)
    .then(checkCommit)
    .then(finishCheck);

  function startCheck() {
    return RespondToUser(
      robot,
      res,
      false,
      `Checking if commit ${commit} exists...`,
      "info"
    );
  }

  function checkCommit() {
    const request = robot
      .http(process.env.GITHUB_API_URL)
      .path(`repos/hashlab/${repository}/commits/${commit}`)
      .header("Authorization", `token ${process.env.GITHUB_TOKEN}`)
      .get();

    // eslint-disable-next-line promise/avoid-new
    return new Promise((resolve, reject) => {
      request((err, resp, body) => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(body));
        }
      });
    });
  }

  function finishCheck(gitHubCommit) {
    return Promise.resolve()
      .then(sendMessage)
      .then(respond);

    function sendMessage() {
      if (R.has("sha", gitHubCommit)) {
        return RespondToUser(
          robot,
          res,
          false,
          `Commit ${commit} exists!`,
          "success"
        );
      } else {
        return RespondToUser(
          robot,
          res,
          false,
          `Sorry, I couldn't find the specified commit ${commit}`,
          "error"
        );
      }
    }

    function respond() {
      return R.has("sha", gitHubCommit);
    }
  }
};

exports.listCommits = function listCommits(robot, res, repository) {
  if (!CheckEnv(robot, "GITHUB_TOKEN") || !CheckEnv(robot, "GITHUB_API_URL")) {
    return null;
  }

  return Promise.resolve()
    .tap(startList)
    .then(listCommits)
    .then(finishList);

  function startList() {
    return RespondToUser(
      robot,
      res,
      false,
      `Listing Github repository ${repository} commits...`,
      "info"
    );
  }

  function listCommits() {
    const request = robot
      .http(process.env.GITHUB_API_URL)
      .path(`repos/hashlab/${repository}/commits`)
      .header("Authorization", `token ${process.env.GITHUB_TOKEN}`)
      .get();

    // eslint-disable-next-line promise/avoid-new
    return new Promise((resolve, reject) => {
      request((err, resp, body) => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(body));
        }
      });
    });
  }

  function finishList(response) {
    return Promise.resolve().then(sendMessage);

    function sendMessage() {
      if (response.message !== "Not Found") {
        const commits = R.map(
          commit =>
            `*${commit.sha}*:\n
            _author:_ ${commit.commit.author.name} - ${
              commit.commit.author.email
            }\n
            _date:_ ${moment(commit.commit.author.date).format(
              "HH:mm DD-MM-YYYY"
            )}\n
            _message:_ ${commit.commit.message}\n`,
          response
        );

        return RespondToUser(robot, res, "", commits.join("\n"), "success");
      } else {
        return RespondToUser(
          robot,
          res,
          false,
          `Sorry, I couldn't list repository ${repository} commits`,
          "error"
        );
      }
    }
  }
};
