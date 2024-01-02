const log = require("../log")("google");
const apikey = require("config").get("google.search");
class OpenAIFunction {
  constructor() {
    this.disabled = !apikey;
    this.name = "google";
    this.description = "perform search on the whole internet";
    this.params = [
      {
        name: "question",
        type: "string",
        required: true,
        description:
          "the question or keyword which you want to search on internet",
      },
      {
        name: "days",
        type: "number",
        required: false,
        description:
          "用这个参数把搜索结果限制在一定的时间范围，单位是天，比如你希望搜索最近三天的新闻，这个参数应该填3",
      },
    ];
  }
  async run(bot, msg, args) {
    const { question, days } = args;
    let url = `https://customsearch.googleapis.com/customsearch/v1?c2coff=1&cx=${require("config").get(
      "google.search_context"
    )}&q=${encodeURIComponent(question)}&key=${require("config").get(
      "google.search"
    )}`;
    if (days) {
      url += `&dateRestrict=d${days}`;
    }
    const rsp = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });
    const json = await rsp.json();
    if (json.items) {
      return json.items.map((item) => ({
        url: item.link,
        title: item.title,
        content: item.snippet,
        from: item.displayLink,
      }));
    } else {
      return "您的搜索没有返回任何结果";
    }
  }
}

module.exports = new OpenAIFunction();
