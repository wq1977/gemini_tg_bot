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

function parseParams(text) {
  const result = [];
  while (text) {
    let waitingChar = " ";
    let originLen = text.length;
    let pStart = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] == waitingChar) {
        result.push(text.substring(pStart, i));
        text = text.substr(i + 1);
        break;
      } else {
        if (text[i] == '"' || text[i] == "'") {
          pStart = i + 1;
          if (!text.substr(0, i).trim()) {
            waitingChar = text[i];
          }
        }
      }
    }
    if (text.length == originLen) {
      result.push(text);
      break;
    }
  }
  return result.map((a) => a.trim()).filter((a) => a);
}

module.exports = {
  tomdv2,
  parseParams,
};
