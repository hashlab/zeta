const Cuid = require("cuid");

module.exports = function getUniqueId() {
  return Cuid() + Cuid() + Cuid();
};
