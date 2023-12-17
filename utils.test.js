const { tomdv2, parseParams } = require("./utils");
test("tomdv2", () => {
  expect(tomdv2("**aaaa**").trim()).toBe("*aaaa*");
  expect(tomdv2("*aaaa*").trim()).toBe("_aaaa_");
  expect(tomdv2("```aaaa```").trim()).toBe("```\naaaa\n```");
});
test("parseParams", () => {
  expect(parseParams("")).toStrictEqual([]);
  expect(parseParams("abc")).toStrictEqual(["abc"]);
  expect(parseParams("a b c")).toStrictEqual(["a", "b", "c"]);
  expect(parseParams("a 'b c'")).toStrictEqual(["a", "b c"]);
  expect(parseParams('a "b c"')).toStrictEqual(["a", "b c"]);
  expect(parseParams("a 'b c\"")).toStrictEqual(["a", "'b c\""]);
});
