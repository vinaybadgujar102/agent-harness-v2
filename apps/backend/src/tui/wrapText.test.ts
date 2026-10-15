import { expect, test } from "bun:test";
import { wrapForTerminal } from "./wrapText";

test("wrapForTerminal breaks long lines on spaces", () => {
  const wrapped = wrapForTerminal("hello world foo bar baz", 11);
  expect(wrapped).toBe("hello world\nfoo bar baz");
});

test("wrapForTerminal hard-breaks when no spaces", () => {
  const wrapped = wrapForTerminal("abcdefghijklmnop", 8);
  expect(wrapped).toBe("abcdefgh\nijklmnop");
});
