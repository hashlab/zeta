const R = require("ramda");
const PrettyJSON = require("prettyjson");

module.exports = function formatJSON(body, disableMarkdown = false) {
  if (R.is(Array, body) && R.length(body) >= 5) {
    disableMarkdown = true;
  }

  if (disableMarkdown) {
    return PrettyJSON.render(body);
  }

  return `\`\`\`\n${PrettyJSON.render(body)}\n\`\`\``;
};
