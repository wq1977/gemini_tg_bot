const gemini = require("../gemini");
module.exports = {
  cmd: "reset",
  description: "清空当前会话",
  clean: true,
  run(bot, msg, args) {
    gemini.clear(msg.chat.id);
    return bot.sendMessage(msg.chat.id, "命令已完成");
  },
};
