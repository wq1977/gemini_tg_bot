class OpenAIFunction {
  constructor() {
    this.name = "date";
    this.description = "获取当前时间";
  }
  async run(bot, msg, args) {
    const date = new Date(Date.now() + 8 * 3600 * 1000);
    return {
      hours: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds(),
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      date: date.getDate(),
      "day of week": date.getDay(),
    };
  }
}

module.exports = new OpenAIFunction();
