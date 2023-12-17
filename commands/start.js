const { tomdv2 } = require("../utils");
module.exports = {
  cmd: "start",
  description: "",
  hidden: true,
  run(bot, msg, args) {
    bot.sendMessage(msg.chat.id, tomdv2(`hello, **ask** me anything!`), {
      parse_mode: "MarkdownV2",
    });
  },
};
