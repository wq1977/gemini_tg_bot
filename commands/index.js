const { parseParams } = require("../utils");
class CommandRun {
  constructor() {
    this.commands = [
      require("./reset"),
      require("./dalle3"),
      require("./start"),
      require("./cron/add"),
      require("./cron/list"),
      require("./cron/modify_prompt"),
      require("./cron/delete"),
    ].filter((c) => !c.disabled);
  }
  async init(bot) {
    for (let cmd of this.commands) {
      cmd.init && cmd.init(bot);
    }
    bot.setMyCommands(
      this.commands
        .filter((c) => !c.hidden)
        .map((c) => ({
          command: c.cmd,
          description: c.description,
        }))
    );
  }
  async go(bot, message) {
    this.runningCmd = null;
    const text = message.text;
    const command = text.split(/\s/)[0].trim();
    const rawParam = text.substr(command.length).trim();
    const params = parseParams(rawParam);
    for (let cmd of this.commands) {
      if (cmd.cmd == command.substr(1)) {
        if (!cmd.args || cmd.args.length <= params.length) {
          const rspmsg = await cmd.run(bot, message, params);
          if (cmd.clean) {
            setTimeout(() => {
              bot.deleteMessage(message.chat.id, message.message_id);
              if (rspmsg) {
                bot.deleteMessage(message.chat.id, rspmsg.message_id);
              }
            }, 2000);
          }
        } else {
          this.runningCmd = cmd;
          this.runningCmdArgs = params;
          bot.sendMessage(message.chat.id, cmd.args[params.length].desc);
        }
        return;
      }
    }
    bot.sendMessage(message.chat.id, `未知命令:${command}`);
  }
  //任何命令都会先走到这里
  async test(bot, message) {
    if (!this.runningCmd) return;
    this.runningCmdArgs.push(message.text);
    if (this.runningCmdArgs.length >= this.runningCmd.args.length) {
      await this.runningCmd.run(bot, message, this.runningCmdArgs);
      this.runningCmd = null;
      this.runningCmdArgs = null;
    } else {
      bot.sendMessage(
        message.chat.id,
        this.runningCmd.args[this.runningCmdArgs.length].desc
      );
    }
    return true;
  }
}

module.exports = new CommandRun();
