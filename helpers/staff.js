module.exports = function getStaff() {
  return (process.env.HUBOT_STAFF || "").split(",");
};
