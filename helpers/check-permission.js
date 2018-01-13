const R = require("ramda");
const RespondToUser = require("./response");
const AllowedUsers = require("../helpers/allowed-users");

module.exports = function checkPermission(robot, response) {
  return () => {
    const Username = R.pathOr("", ["message", "user", "name"], response);

    if (!R.contains(Username, AllowedUsers())) {
      return RespondToUser(
        robot,
        response,
        `@${Username} you're not allowed to perform this action!`
      ).then(() => false);
    }

    return true;
  };
};
