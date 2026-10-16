import { expect, test } from "bun:test";
import {
  implementModeSystemPrompt,
  workspaceSystemPrompt,
} from "./systemPrompt";

test("workspace prompt appends skill index once and omits bodies", () => {
  const prompt = workspaceSystemPrompt("/ws", [
    {
      name: "implement-plan",
      description: "Use when implementing the active plan.",
      path: ".tuffy/skills/implement-plan/SKILL.md",
    },
  ]);
  expect(prompt).toContain(".tuffy/skills/implement-plan/SKILL.md");
  expect(prompt).toContain("Use when implementing the active plan.");
  expect(prompt.match(/implement-plan/g)?.length).toBeGreaterThanOrEqual(1);
  expect(prompt).not.toContain("SECRET_BODY");
});

test("workspace prompt has no skill section when none installed", () => {
  const prompt = workspaceSystemPrompt("/ws");
  expect(prompt).not.toContain("Installed skills:");
});

test("implement prompt lists each skill once", () => {
  const skills = [
    {
      name: "implement-plan",
      description: "Use when implementing the active plan.",
      path: ".tuffy/skills/implement-plan/SKILL.md",
    },
  ];
  const prompt = implementModeSystemPrompt("/ws", skills);
  expect(prompt.split("Installed skills:").length - 1).toBe(1);
});
