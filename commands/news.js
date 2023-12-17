const gemini = require("../gemini");
module.exports = {
  cmd: "news",
  description: "输入一段提示，将自动为您搜索相关的新闻",
  args: [{ desc: "请输入你感兴趣的主题" }],
  disabled: !require("config").get("news.apikey"),
  async run(bot, msg, args) {
    const [prompt] = args;
    msg.text = `请先把 \`${prompt}\` 翻译成英语，然后搜索一下和翻译结果相关的新闻，请尽可能多的展示内容,将结果翻译成中文并保留消息源和发布时间和相关网址`;
    await gemini.go(bot, msg);
  },
};
