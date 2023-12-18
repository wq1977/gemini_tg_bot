const levels = require("../../levels");
const { tomdv2 } = require("../../utils");
module.exports = {
  cmd: "cron_list",
  description: "列举所有的定时任务",
  async run(bot, msg, args) {
    const tasks = await levels.lookup("/cron/task/");
    bot.sendMessage(
      msg.chat.id,
      tomdv2(
        `以下是目前的定时任务:\n${tasks
          .map(
            (t) => `**${t.value.id}**(${t.value.interval}): ${t.value.prompt}`
          )
          .join("\n")}`
      ),
      {
        parse_mode: "MarkdownV2",
      }
    );
  },
};
