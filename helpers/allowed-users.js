module.exports = function getAllowedUsers () {
  return (process.env.HUBOT_ALLOWED_USERS || '').split(',')
}
