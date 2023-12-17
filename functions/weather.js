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
        name: "place",
        type: "string",
        required: true,
        description: "要查询的地方，可以是城市或者地区",
      },
    ];
  }
  async run(bot, msg, args) {
    const { place } = args;
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
    return {
      位置名称: `${country} ${adm1} ${adm2} ${name}`,
      最近天气: json2.daily.map((day) => ({
        日期: day.fxDate,
        白天天气: day.textDay,
        夜晚天气: day.textNight,
        最低温度: day.tempMin,
        最高温度: day.tempMax,
        湿度: day.humidity,
        白天风速: `${day.windDirDay} ${day.windScaleDay}级`,
        夜间风速: `${day.windDirNight} ${day.windScaleNight}级`,
        月相: day.moonPhase,
        月出时间: day.moonrise,
        日出时间: day.sunrise,
        日落时间: day.sunset,
      })),
    };
  }
}

module.exports = new OpenAIFunction();
