import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  implementationUserPrompt,
  loadActivePlan,
  saveActivePlan,
} from "./planStore";

test("save and load active plan", async () => {
  const root = await mkdtemp(join(tmpdir(), "tuffy-plan-"));
  try {
    await saveActivePlan(root, "# Plan\n\n- [ ] step one");
    const loaded = await loadActivePlan(root);
    expect(loaded).toContain("step one");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("implementation prompt references plan todos", () => {
  const p = implementationUserPrompt("- [ ] do thing");
  expect(p).toContain("do thing");
  expect(p).toContain("[~]");
  expect(p).toContain(".tuffy/plans/active.md");
});
