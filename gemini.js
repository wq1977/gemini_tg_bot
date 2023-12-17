const log = require("./log")("gemini");
const { tomdv2 } = require("./utils");
class Gemini {
  constructor() {
    this.sessions = {};
  }
  get functions() {
    return require("./functions")
      .filter((f) => !f.disabled)
      .reduce((r, f) => {
        r[f.name] = f;
        return r;
      }, {});
  }
  async callFunction(bot, message, name, args) {
    if (this.functions[name]) {
      return await this.functions[name].run(bot, message, args);
    }
    throw new Error(`未知函数:${name}`);
  }
  get tools() {
    return [
      {
        functionDeclarations: Object.values(this.functions).map((f) => ({
          name: f.name,
          description: f.description,
          parameters: {
            type: "object",
            properties: (f.params || []).reduce((r, p) => {
              r[p.name] = {
                type: p.type,
                description: p.description,
              };
              return r;
            }, {}),
            required: (f.params || [])
              .filter((p) => p.required)
              .map((p) => p.name),
          },
        })),
      },
    ];
  }
  async talk2gemini(bot, message) {
    const chatid = message.chat.id;
    const body = {
      contents: this.sessions[chatid].queue.map((m) => ({
        role: m.role,
        parts: m.parts,
      })),
      tools: this.tools,
      generationConfig: {
        maxOutputTokens: 1500,
      },
    };
    const gemini_key = require("config").get("gemini.apikey");
    if (!gemini_key) {
      throw new Error("需要先设置 gemini 的 apikey");
    }
    const rsp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${gemini_key}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    const json = await rsp.json();
    log.info({ body, json }, "response from fetch");
    if (json) {
      const functionResponses = [];
      if (json.candidates && json.candidates.length) {
        const parts = json.candidates[0].content.parts;
        this.sessions[chatid].queue.push({
          role: "model",
          parts,
          timestamp: new Date(),
        });
        for (let part of parts) {
          if (part.functionCall) {
            let content;
            try {
              content = await this.callFunction(
                bot,
                message,
                part.functionCall.name,
                part.functionCall.args
              );
            } catch (error) {
              log.error(error, "执行函数错误");
              content = `执行错误：${error.toString()}`;
            }
            if (part.functionCall.name == "text2image") {
              if (typeof content == "object" && content.length) {
                for (let elem of content) {
                  this.sessions[chatid].photos.push({
                    type: "photo",
                    media: elem,
                    caption: part.functionCall.args.prompt,
                  });
                }
              }
            }
            const functionResponse = {
              name: part.functionCall.name,
              response: {
                name: part.functionCall.name,
                content,
              },
            };
            functionResponses.push(functionResponse);
          }
        }
        if (functionResponses.length) {
          this.sessions[chatid].queue.push({
            role: "function",
            parts: functionResponses.map((functionResponse) => ({
              functionResponse,
            })),
          });
          await this.talk2gemini(bot, message);
          return;
        }
        const text = json.candidates[0].content.parts[0].text;
        if (text) {
          this.bot.sendMessage(chatid, tomdv2(text), {
            parse_mode: "MarkdownV2",
          });
          if (this.sessions[chatid].photos.length) {
            this.bot.sendMediaGroup(chatid, this.sessions[chatid].photos);
            this.sessions[chatid].photos = [];
          }
        } else {
          this.bot.sendMessage(chatid, "未能识别的gemini响应");
        }
      } else {
        this.sessions[chatid].queue.splice(
          this.sessions[chatid].queue.length - 1
        ); //最后一个问题遇到错误，可能被拒绝回答，如果保留就会遇到连续两句user的错误
        if (json.error) {
          this.bot.sendMessage(
            chatid,
            `gemini遇到可以识别的错误：${json.error.message}`
          );
          return;
        }
        if (json.promptFeedback.blockReason) {
          this.bot.sendMessage(
            chatid,
            `gemini不愿意回答这个问题，原因是: ${json.promptFeedback.blockReason}`
          );
          return;
        }
      }
    } else {
      this.bot.sendMessage(chatid, "gemini沉默了");
    }
  }
  clear(chatid) {
    log.info({ chatid }, "clear chatid for manual or timer reason");
    if (this.sessions[chatid]) {
      delete this.sessions[chatid];
    }
  }
  async append(bot, msg) {
    const chatid = msg.chat.id;
    if (!this.sessions[chatid]) {
      this.sessions[chatid] = { queue: [], timer: null, photos: [] };
    }
    if (this.sessions[chatid].timer) {
      clearTimeout(this.sessions[chatid].timer);
    }
    this.sessions[chatid].timer = setTimeout(() => {
      this.clear(chatid);
    }, 3 * 60 * 1000);
    this.sessions[chatid].queue.push({
      role: "user",
      parts: {
        text: msg.text,
      },
      timestamp: new Date(msg.time),
    });
    await this.talk2gemini(bot, msg);
  }
  async go(bot, message) {
    const typing = setInterval(() => {
      bot.sendChatAction(message.chat.id, "typing");
    }, 3000);
    try {
      await this.append(bot, message);
    } catch (error) {
      log.error(error, "gemini执行遇到错误");
      bot.sendMessage(message.chat.id, `遇到错误:${error}`);
    }
    clearInterval(typing);
  }
}

module.exports = new Gemini();
