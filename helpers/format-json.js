const PrettyJSON = require("prettyjson");

module.exports = function formatJSON(body, disableMarkdown = false) {
  if (disableMarkdown) {
    return PrettyJSON.render(body);
  }

  return `\`\`\`\n${PrettyJSON.render(body)}\n\`\`\``;
};
