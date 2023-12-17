const API_KEY = require("config").get("angerate.apikey");
class OpenAIFunction {
  constructor() {
    this.disabled = !API_KEY;
    this.name = "rate";
    this.description =
      "获取国际货币兑换人民币的实时汇率，返回的值代表多少元国际货币可以兑换1元人民币";
    this.params = [
      {
        name: "code",
        type: "string",
        required: true,
        description: "要查询的货币的缩写，比如USD,PKG等",
      },
    ];
  }
  async run(bot, msg, args) {
    const code = args.code.toUpperCase();
    const rsp = await fetch(
      `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/cny`
    );
    const json = await rsp.json();
    if (json.result !== "success") return "获取汇率失败";
    if (!(code in json.conversion_rates)) return `不认识的货币代码:${code}`;
    return json.conversion_rates[code];
  }
}

module.exports = new OpenAIFunction();
