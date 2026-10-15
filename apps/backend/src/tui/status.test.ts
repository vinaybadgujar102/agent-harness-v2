import { expect, test } from "bun:test";
import { statusForTool } from "./status";

test("statusForTool names the action and path", () => {
  expect(statusForTool("read_file", { path: "src/a.ts" })).toBe(
    "reading src/a.ts",
  );
  expect(statusForTool("write_file", { path: "src/a.ts" })).toBe(
    "editing src/a.ts",
  );
  expect(statusForTool("list_dir", { path: "." })).toBe("listing .");
});
