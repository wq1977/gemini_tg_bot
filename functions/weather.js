const log = require("../log")("weather");
const apikey = require("config").get("qweather.apikey");
class OpenAIFunction {
  constructor() {
    this.disabled = !apikey;
    this.name = "weather";
    this.description =
      "查询某个地方最近几天的天气，返回的指标包括：日期，天气，温度、湿度、风速，日出日落时间和月出时间，月相等";
    this.params = [
      {
        name: "day",
        type: "integer",
        required: true,
        description:
          "用整数表示的要查询的日期，0 代表今天，1 代表明天，2 代表后天，依次类推",
      },
      {
        name: "place",
        type: "string",
        required: true,
        description: "要查询的地方，可以是城市或者地区",
      },
    ];
  }
  async run(bot, msg, args) {
    const { day, place } = args;
    const rsp = await fetch(
      `https://geoapi.qweather.com/v2/city/lookup?location=${encodeURIComponent(
        place
      )}&key=${apikey}`
    );
    const json = await rsp.json();
    if (json.code != "200") return `查询位置失败`;
    const { id, name, country, adm1, adm2 } = json.location[0];
    const rsp2 = await fetch(
      `https://devapi.qweather.com/v7/weather/7d?location=${id}&key=${apikey}`
    );
    const json2 = await rsp2.json();
    if (json2.code != "200") return `查询天气失败`;
    if (day < 0 || day > 6) return `超出可以查询的日期范围`;
    const date = require("moment")()
      .add(day, "days")
      .add(8, "hours")
      .format("YYYY-MM-DD");
    const info = json2.daily.filter((d) => d.fxDate == date)[0];
    if (!info) return `没有查询到 ${date} 的天气信息`;
    return {
      位置名称: `${country} ${adm1} ${adm2} ${name}`,
      日期: date,
      白天天气: info.textDay,
      夜晚天气: info.textNight,
      最低温度: info.tempMin,
      最高温度: info.tempMax,
      湿度: info.humidity,
      白天风速: `${info.windDirDay} ${info.windScaleDay}级`,
      夜间风速: `${info.windDirNight} ${info.windScaleNight}级`,
      月相: info.moonPhase,
      月出时间: info.moonrise,
      日出时间: info.sunrise,
      日落时间: info.sunset,
    };
  }
}

module.exports = new OpenAIFunction();
