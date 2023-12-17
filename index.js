const TelegramBot = require("node-telegram-bot-api");
const gemini = require("./gemini");
const { tomdv2 } = require("./utils");
const token = require("config").get("telegram.botkey");
if (!token) {
  throw new Error("需要先设置 Telegram 的 bot token");
}
let options = {
  polling: true,
};
if (process.env.https_proxy) {
  options = {
    ...options,
    request: {
      proxy: process.env.https_proxy,
    },
  };
}
const bot = new TelegramBot(token, options);
const log = require("./log")("main");
gemini.bot = bot;

setInterval(() => {
  const polling = bot.isPolling();
  if (!polling) {
    bot.startPolling({ restart: true });
  }
  log.info({ polling }, "check bot running ...");
}, 10000);

const commands = [
  {
    cmd: "reset",
    description: "清空当前会话",
    clean: true,
    run(msg) {
      gemini.clear(msg.chat.id);
      return "命令已完成";
    },
  },
  {
    cmd: "dalle3",
    description: "输入一段提示，自动扩充成dalle3的提示词",
    run(msg) {
      let prompt;
      if (msg.text.startsWith("/")) {
        prompt = msg.text.substr(7).trim();
      } else {
        prompt = msg.text.trim();
      }
      if (prompt) {
        msg.text = `revise \`${prompt}\` to a DALL-E prompt in English with the scene and detail, then call any function you could to draw a picture using the returned value as prompt`;
        goGemini(msg);
      } else {
        return "请输入一段提示词:";
      }
    },
  },
];

for (let command of commands) {
  bot.onText(`/${command.cmd}`, async (msg) => {
    const result = await command.run(msg);
    if (result) {
      bot.sendMessage(msg.chat.id, result);
    }
  });
}
bot.setMyCommands(
  commands.map((c) => ({
    command: c.cmd,
    description: c.description,
  }))
);

async function goGemini(message) {
  const typing = setInterval(() => {
    bot.sendChatAction(message.chat.id, "typing");
  }, 3000);
  try {
    await gemini.append(bot, message);
  } catch (error) {
    log.error(error, "gemini执行遇到错误");
    bot.sendMessage(message.chat.id, `遇到错误:${error}`);
  }
  clearInterval(typing);
}

let waitingCmd = null;
bot.on("message", async function (message) {
  log.info({ message }, "got message callback");
  if (message.photo && message.photo.length) {
    message.text = `这里有一幅图片，它的编号是"${
      message.photo[message.photo.length - 1].file_id
    }", ${message.caption || "请描述图片里面的内容"}`;
  }
  if (!message.text) return;
  if (message.text.startsWith("/")) {
    waitingCmd = null;
    if (message.text != "/start") {
      for (let cmd of commands) {
        const cmdInText = message.text.split(/\s/)[0];
        if (cmdInText == `/${cmd.cmd}`) {
          const result = await cmd.run(message);
          if (result) {
            const msg = await bot.sendMessage(message.chat.id, result);
            if (msg && cmd.clean) {
              setTimeout(() => {
                bot.deleteMessage(message.chat.id, msg.message_id);
              }, 2000);
            }
            if (result.endsWith(":")) {
              waitingCmd = cmd;
            }
          }
          if (cmd.clean) {
            setTimeout(() => {
              bot.deleteMessage(message.chat.id, message.message_id);
            }, 2000);
          }
          return;
        }
      }
      bot.sendMessage(message.chat.id, `未知命令`);
    } else {
      bot.sendMessage(message.chat.id, tomdv2(`hello, **ask** me anything!`), {
        parse_mode: "MarkdownV2",
      });
    }
    return;
  } else if (waitingCmd) {
    await waitingCmd.run(message);
    waitingCmd = null;
  } else {
    await goGemini(message);
  }
});
