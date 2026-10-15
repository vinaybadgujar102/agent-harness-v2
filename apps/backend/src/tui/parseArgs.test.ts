import { expect, test } from "bun:test";
import { parseArgs } from "./parseArgs";

test("init", () => {
  expect(parseArgs(["init"])).toEqual({ cmd: "init" });
});

test("workspace and first prompt", () => {
  expect(
    parseArgs(["--workspace", "/tmp/proj", "fix", "the", "bug"]),
  ).toEqual({
    cmd: "tui",
    workspace: "/tmp/proj",
    firstPrompt: "fix the bug",
  });
});
