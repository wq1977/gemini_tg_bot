const level = require("classic-level");
const log = require("./log")("level");
class Levels {
  constructor() {
    let dbpath = require("config").get("level.dbpath");
    if (!dbpath) {
      dbpath = require("path").join(__dirname, "data", "level");
    }
    this.db = new level.ClassicLevel(dbpath, {
      valueEncoding: "json",
    });
  }
  async get(key, def) {
    try {
      return await this.db.get(key);
    } catch (error) {
      return def;
    }
  }
  async set(key, value) {
    return await this.db.put(key, value);
  }
  async lookup(prefix) {
    const iterator = this.db.iterator();
    const result = [];
    try {
      let entry;
      await iterator.seek(prefix);
      while ((entry = await iterator.next())) {
        let [key, value] = entry;
        key = key.toString();
        if (!key.startsWith(prefix)) break;
        result.push({ key, value });
      }
      return result;
    } catch (err) {
      log.error(err, "seek error");
    }
  }
}

module.exports = new Levels();
