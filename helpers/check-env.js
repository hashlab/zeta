module.exports = function checkEnv (robot, name) {
  if (!process.env[name]) {
    robot.logger.error(`The environment variable '${name}' is required!`)
    return false
  }

  if (process.env[name] === '') {
    robot.logger.error(`The environment variable '${name}' cannot be blank!`)
    return false
  }

  return true
}
