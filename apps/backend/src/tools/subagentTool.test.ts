import { expect, test } from "bun:test";
import type { GoogleGenAI } from "@google/genai";
import {
  createRunSubagentTool,
  effectiveSubagentProfile,
  workerToolsForProfile,
} from "./subagentTool";

const fakeClient = {} as GoogleGenAI;

test("worker tool lists exclude run_subagent", () => {
  const readOnly = workerToolsForProfile("/ws", "read_only");
  const readWrite = workerToolsForProfile("/ws", "read_write");
  for (const tools of [readOnly, readWrite]) {
    expect(tools.map((t) => t.name)).not.toContain("run_subagent");
    expect(tools.map((t) => t.name)).toContain("read_file");
  }
  expect(readOnly.map((t) => t.name)).not.toContain("write_file");
  expect(readWrite.map((t) => t.name)).toContain("write_file");
});

test("plan mode forces read_only profile", () => {
  expect(effectiveSubagentProfile("plan", "read_write")).toBe("read_only");
  expect(effectiveSubagentProfile("agent", undefined)).toBe("read_only");
  expect(effectiveSubagentProfile("implement", "read_write")).toBe("read_write");
});

test("run_subagent returns worker summary via inject", async () => {
  const tool = createRunSubagentTool({
    client: fakeClient,
    workspaceRoot: "/ws",
    mode: "agent",
    runWorker: async (input) => `done:${input.role}:${input.tool_profile}`,
  });
  const out = await tool.execute({
    role: "explore",
    brief: "List src and summarize layout",
    tool_profile: "read_only",
  });
  expect(out).toMatchObject({
    status: "completed",
    role: "explore",
    summary: "done:explore:read_only",
  });
});

test("read_write rejected in plan mode", async () => {
  const tool = createRunSubagentTool({
    client: fakeClient,
    workspaceRoot: "/ws",
    mode: "plan",
    runWorker: async () => "nope",
  });
  const out = await tool.execute({
    role: "x",
    brief: "y",
    tool_profile: "read_write",
  });
  expect(out).toMatchObject({ error: expect.stringContaining("plan mode") });
});
