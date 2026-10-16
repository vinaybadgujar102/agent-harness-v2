import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ensureDefaultSkills,
  loadSkills,
  parseSkillFrontmatter,
  skillIndexPrompt,
  skillRelPath,
} from "./skillStore";

test("parseSkillFrontmatter accepts spec-valid YAML", () => {
  const parsed = parseSkillFrontmatter(`---
name: implement-plan
description: Use when implementing the active plan.
---

# Body
read_file then write_file
`);
  expect(parsed).toEqual({
    name: "implement-plan",
    description: "Use when implementing the active plan.",
  });
});

test("parseSkillFrontmatter rejects bad names", () => {
  expect(
    parseSkillFrontmatter("---\nname: Implement-Plan\ndescription: when x\n---\n\nbody\n"),
  ).toBeNull();
});

test("loadSkills indexes metadata only and skips invalid dirs", async () => {
  const root = await mkdtemp(join(tmpdir(), "tuffy-skills-"));
  try {
    const good = join(root, ".tuffy/skills/implement-plan");
    const bad = join(root, ".tuffy/skills/Bad-Name");
    await mkdir(good, { recursive: true });
    await mkdir(bad, { recursive: true });
    await writeFile(
      join(good, "SKILL.md"),
      `---
name: implement-plan
description: Use when implementing tasks from the active plan.
---

SECRET_BODY_TOKEN
`,
    );
    await writeFile(
      join(bad, "SKILL.md"),
      `---
name: Bad-Name
description: when broken
---

nope
`,
    );
    const mismatch = join(root, ".tuffy/skills/other-skill");
    await mkdir(mismatch, { recursive: true });
    await writeFile(
      join(mismatch, "SKILL.md"),
      `---
name: implement-plan
description: Use when the folder name does not match.
---

x
`,
    );
    const skills = loadSkills(root);
    expect(skills).toEqual([
      {
        name: "implement-plan",
        description: "Use when implementing tasks from the active plan.",
        path: skillRelPath("implement-plan"),
      },
    ]);
    const index = skillIndexPrompt(skills);
    expect(index).toContain("implement-plan");
    expect(index).toContain(".tuffy/skills/implement-plan/SKILL.md");
    expect(index).toContain("read_file");
    expect(index).not.toContain("SECRET_BODY_TOKEN");
    expect(skillIndexPrompt([])).toBe("");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("ensureDefaultSkills copies bundled skills and does not overwrite", async () => {
  const root = await mkdtemp(join(tmpdir(), "tuffy-defaults-"));
  try {
    ensureDefaultSkills(root);
    const names = loadSkills(root).map((s) => s.name).sort();
    expect(names).toEqual(["edit-files", "explore-workspace", "implement-plan"]);
    const custom = join(root, ".tuffy/skills/edit-files/SKILL.md");
    await writeFile(custom, "USER_KEEP\n");
    ensureDefaultSkills(root);
    expect(await readFile(custom, "utf8")).toBe("USER_KEEP\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
