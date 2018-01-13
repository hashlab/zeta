const PrettyJSON = require("prettyjson");

module.exports = function formatJSON(body) {
  return `\`\`\`\n${PrettyJSON.render(body)}\n\`\`\``;
};
