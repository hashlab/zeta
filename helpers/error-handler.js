const R = require("ramda");
const Notifier = require("./notifier");
const RespondToUser = require("./response");

module.exports = function errorHandler(robot, response, command) {
  return err => {
    const Username = R.pathOr("", ["message", "user", "name"], response);

    return Notifier.notifyStaff(
      robot,
      `@${Username} had an issue while running the '${command}' command: ${
        err.stack
      }`
    ).then(() => RespondToUser(robot, response, err));
  };
};
