const gemini = require("../gemini");
module.exports = {
  cmd: "dalle3",
  description: "输入一段提示，自动扩充成dalle3的提示词",
  args: [{ desc: "请输入你的提示词" }],
  disabled: !require("config").get("bing.cookie"),
  async run(bot, msg, args) {
    const [prompt] = args;
    msg.text = `revise \`${prompt}\` to a DALL-E prompt in English with the scene and detail, then call any function you could to draw a picture using the returned value as prompt`;
    await gemini.go(bot, msg);
  },
};
