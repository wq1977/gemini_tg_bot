const levels = require("../../levels");
module.exports = {
  cmd: "cron_delete",
  description: "删除定时任务",
  args: [{ desc: "要删除的定时任务的编号，请注意：该任务将立即删除" }],

  async run(bot, msg, args) {
    const [id] = args;
    const key = `/cron/task/${id}`;
    await levels.del(key);
    bot.sendMessage(msg.chat.id, "任务已删除");
  },
};
