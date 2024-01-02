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
    const sessionid = message.chat.session || message.chat.id;
    const body = {
      contents: this.sessions[sessionid].queue.map((m) => ({
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
        this.sessions[sessionid].queue.push({
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
              content = `执行错误：${error.toString()}，将自动清空当前会话`;
              setTimeout(() => {
                this.clear(sessionid);
              }, 1000);
            }
            if (part.functionCall.name == "text2image") {
              if (typeof content == "object" && content.length) {
                for (let elem of content) {
                  this.sessions[sessionid].photos.push({
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
          this.sessions[sessionid].queue.push({
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
          if (
            text.trim().toLowerCase() != "null" &&
            text.trim().toLowerCase() != "**null**"
          ) {
            this.bot.sendMessage(message.chat.id, tomdv2(text), {
              parse_mode: "MarkdownV2",
            });
          }
          if (this.sessions[sessionid].photos.length) {
            this.bot.sendMediaGroup(
              message.chat.id,
              this.sessions[sessionid].photos
            );
            this.sessions[sessionid].photos = [];
          }
        } else {
          this.bot.sendMessage(
            message.chat.id,
            `未能识别的gemini响应:${sessionid}`
          );
        }
      } else {
        this.sessions[sessionid].queue.splice(
          this.sessions[sessionid].queue.length - 1
        ); //最后一个问题遇到错误，可能被拒绝回答，如果保留就会遇到连续两句user的错误
        if (json.error) {
          this.bot.sendMessage(
            message.chat.id,
            `gemini遇到可以识别的错误(${sessionid}):${json.error.message}，当前会话将被清空`
          );
          setTimeout(() => {
            this.clear(sessionid);
          }, 1000);
          return;
        }
        if (json.promptFeedback.blockReason) {
          this.bot.sendMessage(
            message.chat.id,
            `gemini不愿意回答这个问题(${sessionid})，原因是: ${json.promptFeedback.blockReason},当前会话将被清空。`
          );
          setTimeout(() => {
            this.clear(sessionid);
          }, 1000);
          return;
        }
      }
    } else {
      this.bot.sendMessage(message.chat.id, `${sessionid}:gemini沉默了`);
    }
  }
  clear(sessionid) {
    log.info({ sessionid }, "clear session for manual or timer reason");
    if (this.sessions[sessionid]) {
      delete this.sessions[sessionid];
    }
  }
  async append(bot, msg) {
    const sessionid = msg.chat.session || msg.chat.id;
    if (!this.sessions[sessionid]) {
      this.sessions[sessionid] = { queue: [], timer: null, photos: [] };
    }
    if (this.sessions[sessionid].timer) {
      clearTimeout(this.sessions[sessionid].timer);
    }
    this.sessions[sessionid].timer = setTimeout(() => {
      this.clear(sessionid);
    }, 3 * 60 * 1000);
    this.sessions[sessionid].queue.push({
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
      bot.sendMessage(message.chat.id, `遇到错误:${error},当前会话将被清空`);
      setTimeout(() => {
        this.clear(message.chat.id);
      }, 1000);
    }
    clearInterval(typing);
  }
}

module.exports = new Gemini();
