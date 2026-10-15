import { expect, test } from "bun:test";
import { Conversation } from "./conversation";

test("restore drops user turn after mark", () => {
  const c = new Conversation();
  c.start("keep");
  const mark = c.mark();
  c.start("gone");
  c.recordAssistant("also gone");
  c.restore(mark);
  expect(c.getTurns()).toEqual([{ type: "user", content: "keep" }]);
});

test("clear empties history", () => {
  const c = new Conversation();
  c.start("x");
  c.clear();
  expect(c.getTurns()).toEqual([]);
});
