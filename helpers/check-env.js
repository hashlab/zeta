module.exports = function checkEnv(robot, name) {
  if (!process.env[name]) {
    robot.logger.error(`The environment variable '${name}' is required!`);
    throw new Error(`The environment variable '${name}' is required!`);
  }

  if (process.env[name] === "") {
    robot.logger.error(`The environment variable '${name}' cannot be blank!`);
    throw new Error(`The environment variable '${name}' cannot be blank!`);
  }

  return true;
};
