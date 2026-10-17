import { expect, test } from "bun:test";
import {
  previewToolResult,
  relativeTime,
  transcriptLinesFromTurns,
  visibleWindow,
} from "./historyUi";

test("relative time buckets", () => {
  const now = 1_000_000_000;
  expect(relativeTime(now - 3_000, now)).toBe("3s");
  expect(relativeTime(now - 120_000, now)).toBe("2m");
  expect(relativeTime(now - 7_200_000, now)).toBe("2h");
  expect(relativeTime(now - 172_800_000, now)).toBe("2d");
});

test("rebuild transcript from turns", () => {
  const long = { n: "x".repeat(300) };
  const lines = transcriptLinesFromTurns([
    { type: "user", content: "hi" },
    { type: "tool_call", toolName: "read_file", callId: "1", args: {} },
    { type: "tool_result", toolName: "read_file", callId: "1", result: long },
    { type: "assistant", content: "done" },
  ]);
  expect(lines[0]).toEqual({ kind: "user", text: "hi" });
  expect(lines[1]).toEqual({ kind: "tool", text: "read_file …" });
  expect(lines[2]?.text.startsWith("read_file done ")).toBe(true);
  expect(lines[2]?.text.endsWith("…")).toBe(true);
  expect(lines[3]).toEqual({ kind: "assistant", text: "done" });
  expect(previewToolResult(long).endsWith("…")).toBe(true);
});

test("visible window keeps pick on screen", () => {
  const items = [0, 1, 2, 3, 4, 5, 6];
  expect(visibleWindow(items, 0, 3).items).toEqual([0, 1, 2]);
  expect(visibleWindow(items, 6, 3).items).toEqual([4, 5, 6]);
  expect(visibleWindow(items, 3, 3).start).toBe(2);
});
