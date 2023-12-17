const marked = require("marked");
const { JSDOM } = require("jsdom");
function tomdv2(text) {
  const html = marked.parse(text);
  const dom = new JSDOM(html);
  function mdEscape(text) {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
  }
  function loopNode(node) {
    if (node.nodeName == "#text") return mdEscape(node.textContent);
    const values = [...(node.childNodes || [])].map((node) => loopNode(node));
    if (node.nodeName == "P") return `${values.join("")}\n`;
    if (node.nodeName == "STRONG") return `*${values.join("")}*`;
    if (node.nodeName == "EM") return `_${values.join("")}_`;
    if (node.nodeName == "CODE") return `\`\`\`\n${values.join("")}\n\`\`\``;
    return values.join("");
  }
  return loopNode(dom.window.document.body);
}

module.exports = {
  tomdv2,
};
