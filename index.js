const TelegramBot = require("node-telegram-bot-api");
const gemini = require("./gemini");
const token = require("config").get("telegram.botkey");
if (!token) {
  throw new Error("需要先设置 Telegram 的 bot token");
}
let options = {
  polling: require("config").get("telegram.host") ? false : true,
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

if (require("config").get("telegram.host")) {
  log.info("set to webhook mode");
  const express = require("express");
  const app = express();
  app.use(express.json());
  app.post(`${require("config").get("telegram.url")}${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
  const port = require("config").get("telegram.port");
  app.listen(port, () => {
    log.info(`Express server is listening on ${port}`);
  });
  bot.setWebHook(
    `https://${require("config").get("telegram.host")}${require("config").get(
      "telegram.url"
    )}${token}`
  );
} else {
  log.info("set to polling mode");
  setInterval(() => {
    const polling = bot.isPolling();
    if (!polling) {
      bot.startPolling({ restart: true });
    }
    log.info({ polling }, "check bot running ...");
  }, 10000);
}

const runCommand = require("./commands");
runCommand.init(bot);
for (let func of require("./functions")) {
  func.init && func.init(bot);
}

async function onMsg(message) {
  log.info({ message }, "new message or modified message");
  if (message.photo && message.photo.length) {
    message.text = `这里有一幅图片，它的编号是"${
      message.photo[message.photo.length - 1].file_id
    }", ${message.caption || "请描述图片里面的内容"}`;
  }
  if (!message.text) return;
  if (message.text.startsWith("/")) {
    await runCommand.go(bot, message);
  } else {
    const result = await runCommand.test(bot, message);
    if (!result) {
      await gemini.go(bot, message);
    }
  }
}
bot.on("edited_message", onMsg);
bot.on("message", onMsg);
