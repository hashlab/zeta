// Description:
//   Helper to interact with Quay API
//
// Dependencies:
//   "ramda": "^0.26.0"
//   "bluebird": "^3.5.3"
//
// Configuration:
//   QUAY_TOKEN
//   QUAY_API_URL
//
// Author:
//   caio.elias@hashlab.com.br

const R = require("ramda");
const Promise = require("bluebird");
const CheckEnv = require("./check-env");
const RespondToUser = require("./response");

Promise.config({
  cancellation: true
});

exports.checkImage = function checkImage(robot, res, quayRepository, commit) {
  if (!CheckEnv(robot, "QUAY_TOKEN") || !CheckEnv(robot, "QUAY_API_URL")) {
    return null;
  }

  return Promise.resolve()
    .tap(startCheck)
    .then(checkTags)
    .then(finishCheck);

  function startCheck() {
    return RespondToUser(
      robot,
      res,
      false,
      "Checking Quay if corresponding image exists...",
      "info"
    );
  }

  function checkTags() {
    const request = robot
      .http(process.env.QUAY_API_URL)
      .path(`repository/hashlab/${quayRepository}/tag`)
      .query({
        specificTag: commit,
        onlyActiveTags: true
      })
      .header("Authorization", `Bearer ${process.env.QUAY_TOKEN}`)
      .get();

    // eslint-disable-next-line promise/avoid-new
    return new Promise((resolve, reject) => {
      request((err, resp, body) => {
        if (
          resp.statusCode >= 300 &&
          resp.statusCode < 400 &&
          R.has("location", resp.headers)
        ) {
          const redirectRequest = robot
            .http(resp.headers.location)
            .header("Authorization", `Bearer ${process.env.QUAY_TOKEN}`)
            .get();
          resolve(
            // eslint-disable-next-line promise/avoid-new
            new Promise((resolve, reject) => {
              redirectRequest((err, resp, body) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(JSON.parse(body).tags);
                }
              });
            })
          );
        }
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(body).tags);
        }
      });
    });
  }

  function finishCheck(response) {
    return Promise.resolve()
      .then(sendMessage)
      .then(respond);

    function sendMessage() {
      if (
        response.length > 0 &&
        response.findIndex(tag => tag.name === commit) > -1
      ) {
        return RespondToUser(
          robot,
          res,
          false,
          `Found image ${commit} at Quay`,
          "success"
        );
      } else {
        return RespondToUser(
          robot,
          res,
          false,
          `Sorry, I couldn't find image ${commit} at Quay`,
          "error"
        );
      }
    }

    function respond() {
      return response.length > 0;
    }
  }
};

exports.checkRepository = function checkRepository(robot, res, quayRepository) {
  if (!CheckEnv(robot, "QUAY_TOKEN") || !CheckEnv(robot, "QUAY_API_URL")) {
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
      "Checking Quay if repository exists...",
      "info"
    );
  }

  function checkRepository() {
    const request = robot
      .http(process.env.QUAY_API_URL)
      .path(`repository/hashlab/${quayRepository}`)
      .header("Authorization", `Bearer ${process.env.QUAY_TOKEN}`)
      .get();

    // eslint-disable-next-line promise/avoid-new
    return new Promise((resolve, reject) => {
      request((err, resp, body) => {
        if (
          resp.statusCode >= 300 &&
          resp.statusCode < 400 &&
          R.has("location", resp.headers)
        ) {
          const redirectRequest = robot
            .http(resp.headers.location)
            .header("Authorization", `Bearer ${process.env.QUAY_TOKEN}`)
            .get();
          resolve(
            // eslint-disable-next-line promise/avoid-new
            new Promise((resolve, reject) => {
              redirectRequest((err, resp, body) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(JSON.parse(body).tags);
                }
              });
            })
          );
        }
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(body));
        }
      });
    });
  }

  function finishCheck(response) {
    return Promise.resolve()
      .then(sendMessage)
      .then(respond);

    function sendMessage() {
      if (R.has("name", response) && response.name === quayRepository) {
        return RespondToUser(
          robot,
          res,
          false,
          `Found Quay repository ${quayRepository}`,
          "success"
        );
      } else {
        return RespondToUser(
          robot,
          res,
          false,
          `Sorry, I couldn't find Quay repository ${quayRepository}`,
          "error"
        );
      }
    }

    function respond() {
      return response.name === quayRepository;
    }
  }
};

exports.listRepositories = function listRepositories(robot, res) {
  if (!CheckEnv(robot, "QUAY_TOKEN") || !CheckEnv(robot, "QUAY_API_URL")) {
    return null;
  }

  return Promise.resolve()
    .tap(startList)
    .then(listRepositories)
    .then(finishList);

  function startList() {
    return RespondToUser(
      robot,
      res,
      false,
      "Listing Quay repositories...",
      "info"
    );
  }

  function listRepositories() {
    const request = robot
      .http(process.env.QUAY_API_URL)
      .path("repository")
      .header("Authorization", `Bearer ${process.env.QUAY_TOKEN}`)
      .query({
        namespace: "hashlab"
      })
      .get();

    // eslint-disable-next-line promise/avoid-new
    return new Promise((resolve, reject) => {
      request((err, resp, body) => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(body).repositories);
        }
      });
    });
  }

  function finishList(response) {
    return Promise.resolve().then(sendMessage);

    function sendMessage() {
      if (response.length > 0) {
        const repositories = R.map(
          repo => `*${repo.name}:* ${repo.description}`,
          response
        );

        return RespondToUser(
          robot,
          res,
          false,
          `${repositories.join("\n")}`,
          "success"
        );
      } else {
        return RespondToUser(
          robot,
          res,
          false,
          "Sorry, I couldn't list Quay repositories",
          "error"
        );
      }
    }
  }
};
