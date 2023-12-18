const log = require("../log")("news");
const apikey = require("config").get("news.apikey");
class OpenAIFunction {
  constructor() {
    this.disabled = !apikey;
    this.name = "news";
    this.description = "fetch latest news related with the input prompt";
    this.params = [
      {
        name: "prompt",
        type: "string",
        required: true,
        description: "the prompt which this news related",
      },
    ];
  }
  async run(bot, msg, args) {
    const { prompt } = args;
    const rsp = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(
        prompt
      )}&sortBy=publishedAt&apiKey=${apikey}&pageSize=20`
    );
    const json = await rsp.json();
    if (json.status == "error") return `遇到错误：${json.message}`;
    return json.articles.map((a) => ({
      source: a.source.name,
      title: a.title,
      url: a.url,
      publishedAt: a.publishedAt,
    }));
  }
}

module.exports = new OpenAIFunction();
