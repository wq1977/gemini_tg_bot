async function streamToBase64(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    readableStream.on("data", (chunk) => {
      chunks.push(chunk);
    });

    readableStream.on("end", () => {
      const buffer = Buffer.concat(chunks);
      const base64Data = buffer.toString("base64");
      resolve(base64Data);
    });

    readableStream.on("error", (err) => {
      reject(err);
    });
  });
}
const log = require("../log")("vision");
class OpenAIFunction {
  constructor() {
    this.name = "vision";
    this.description = "回答用编号代表的某个图片相关的问题";
    this.params = [
      {
        name: "id",
        type: "string",
        required: true,
        description: "图片的编号",
      },
      {
        name: "prompt",
        type: "string",
        required: true,
        description: "要询问的问题",
      },
    ];
  }
  async run(bot, msg, args) {
    const { id, prompt } = args;
    const gemini_key = require("config").get("gemini.apikey");
    log.info({ id, prompt }, "vision call params");
    const stream = await bot.getFileStream(id);
    const b64 = await streamToBase64(stream);
    const rsp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${gemini_key}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: "image/png",
                    data: b64,
                  },
                },
              ],
            },
          ],
        }),
      }
    );
    const json = await rsp.json();
    log.info({ json }, "response from vision");
    return json.candidates[0].content.parts[0].text;
  }
}

module.exports = new OpenAIFunction();
