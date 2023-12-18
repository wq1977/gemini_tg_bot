const levels = require("../../levels");
module.exports = {
  cmd: "cron_modify_prompt",
  description: "更改定时任务的命令提示",
  args: [{ desc: "要更改的定时任务的编号" }, { desc: "新的任务命令" }],

  async run(bot, msg, args) {
    const [id, prompt] = args;
    const key = `/cron/task/${id}`;
    const old = await levels.get(key);
    await levels.set(key, { ...old, prompt });
    bot.sendMessage(msg.chat.id, "任务已修改");
  },
};
