const { RestClient } = require("okx-api");
const API_KEY = require("config").get("okx.apikey");
const API_SECRET = require("config").get("okx.secret");
const API_PASSPHRASE = require("config").get("okx.passphrase");
const market = require("config").get("okx.market");

class OpenAIFunction {
  constructor() {
    this.disabled = !API_KEY || !API_SECRET || !API_PASSPHRASE;
    this.name = "price";
    this.description =
      "获取某种数字货币兑美元的最新价格,24小时最高价和最低价以及24小时内成交量等信息";
    this.params = [
      {
        name: "coin",
        type: "string",
        required: true,
        description: "要查询的数字货币的三位字符缩写，比如BTC,ton等",
      },
    ];
    this.client = new RestClient(
      {
        apiKey: API_KEY,
        apiSecret: API_SECRET,
        apiPass: API_PASSPHRASE,
      },
      market
    );
  }
  async run(bot, msg, args) {
    const coin = args.coin.toUpperCase();
    let price = await this.client.getTicker(`${coin}-USDT`);
    if (price && price.length) {
      price = price[0];
      return {
        当前价格: parseFloat(price.bidPx),
        "24小时内最高价": parseFloat(price.high24h),
        "24小时内最低价": parseFloat(price.low24h),
        "24小时内成交量": parseFloat(price.vol24h),
      };
    }
    return `未能获取到 ${coin} 的价格信息`;
  }
}

module.exports = new OpenAIFunction();

if (require.main === module) {
  new OpenAIFunction().run({ coin: "BTC" }).then(console.log);
}
