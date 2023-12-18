const log = require("../../log")("cron");
const gemini = require("../../gemini");
const levels = require("../../levels");
module.exports = {
  cmd: "cron",
  description: "增加一个定时任务",
  args: [
    { desc: "定时任务的执行频率，单位是分钟" },
    { desc: "定时任务需要执行的命令" },
  ],
  async init(bot) {
    this.lastTick = null;
    setInterval(async () => {
      const tick = require("moment")().diff(require("moment")(0), "minutes");
      if (tick == this.lastTick) {
        return;
      }
      this.lastTick = tick;
      const tasks = await levels.lookup("/cron/task/");
      for (let task of tasks) {
        if (tick % task.value.interval == 0) {
          log.info(
            { tick, interval: task.value.interval, id: task.value.id },
            "need run task"
          );
          gemini.append(bot, {
            chat: { id: task.value.chatid, session: `cron-${task.id}-${tick}` },
            text: task.value.prompt,
          });
        } else {
          log.info(
            { tick, interval: task.value.interval, id: task.value.id },
            "no need run task"
          );
        }
      }
    }, 30000);
  },
  async run(bot, msg, args) {
    const [interval, prompt] = args;
    const id = require("moment")().add(8, "hours").format("YYYYMMDDHHmmssSSS");
    await levels.set(`/cron/task/${id}`, {
      id,
      interval: parseInt(interval),
      prompt,
      chatid: msg.chat.id,
    });
    bot.sendMessage(msg.chat.id, "定时任务已经成功添加");
  },
};
