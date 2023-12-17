const log = require("../log")("dalle3");
const cookies = require("config").get("bing.cookie");
async function work(prompt) {
  const url_encoded_prompt = encodeURIComponent(prompt);
  const payload = `q=${url_encoded_prompt}&qs=ds`;
  const options = {
    redirect: "manual",
    headers: {
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "max-age=0",
      "content-type": "application/x-www-form-urlencoded",
      referrer: "https://www.bing.com/images/create/",
      origin: "https://www.bing.com",
      "user-agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36 Edg/110.0.1587.63",
      "x-forwarded-for": `13.${Math.floor(
        Math.random() * 3 + 104
      )}.${Math.floor(Math.random() * 254 + 1)}.${Math.floor(
        Math.random() * 254 + 1
      )}`,
      Cookie: cookies,
    },
  };
  let rsp = await fetch(
    `https://www.bing.com/images/create?q=${url_encoded_prompt}&rt=4&FORM=GENCRE`,
    {
      method: "POST",
      body: payload,
      ...options,
    }
  );
  let text = await rsp.text();
  const lower = text.toLowerCase();
  if (lower.indexOf("this prompt is being reviewed") >= 0) {
    throw new Error("提示词不安全");
  }
  if (lower.indexOf("this prompt has been blocked") >= 0) {
    throw new Error("提示词被拒绝");
  }
  if (
    lower.indexOf(
      "we're working hard to offer image creator in more languages"
    ) >= 0
  ) {
    throw new Error("不支持的语言");
  }
  if (rsp.status != 302) {
    rsp = await fetch(
      `https://www.bing.com/images/create?q=${url_encoded_prompt}&rt=3&FORM=GENCRE`,
      {
        method: "POST",
        body: payload,
        ...options,
      }
    );
    if (rsp.status != 302) {
      throw new Error("没有得到想要的重定向");
    }
    text = await rsp.text();
  }
  const id = rsp.headers
    .get("Location")
    .split("id=")[1]
    .split('">')[0]
    .replace("&nfy=1", "");
  const result = [];
  while (true) {
    await new Promise((r) => setTimeout(r, 1000));
    const pollurl = `https://www.bing.com/images/create/async/results/${id}?q=${url_encoded_prompt}`;
    const pollrsp = await fetch(pollurl, options);
    const polltxt = await pollrsp.text();
    if (polltxt.trim()) {
      const matchs = polltxt.matchAll(/src="([^"]+)"/g);
      for (value of [...matchs]) {
        const url = value[1];
        if (url.indexOf("?w=") > 0) {
          result.push(url.split("?w=")[0]);
        }
      }
      break;
    }
  }
  return result;
}

class OpenAIFunction {
  constructor() {
    this.disabled = !cookies;
    this.name = "text2image";
    this.description =
      "Generate a group of images based on the content of the prompt";
    this.params = [
      {
        name: "prompt",
        type: "string",
        required: true,
        description: "the prompt which this function based on",
      },
    ];
  }
  async run(bot, msg, args) {
    const { prompt } = args;
    return await work(prompt);
  }
}

module.exports = new OpenAIFunction();
