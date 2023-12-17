const { tomdv2 } = require("./utils");
test("tomdv2", () => {
  expect(tomdv2("**aaaa**").trim()).toBe("*aaaa*");
  expect(tomdv2("*aaaa*").trim()).toBe("_aaaa_");
  expect(tomdv2("```aaaa```").trim()).toBe("```\naaaa\n```");
});
