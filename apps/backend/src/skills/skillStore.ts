import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { join } from "node:path";

export const SKILLS_DIR = ".tuffy/skills";
export const SKILL_FILE = "SKILL.md";
const MAX_SKILL_BYTES = 256 * 1024;

export type SkillMeta = {
  name: string;
  description: string;
  path: string;
};

export function isValidSkillName(name: string): boolean {
  if (name.length < 1 || name.length > 64) return false;
  if (name.startsWith("-") || name.endsWith("-")) return false;
  if (name.includes("--")) return false;
  return /^[a-z0-9-]+$/.test(name);
}

export function parseSkillFrontmatter(
  text: string,
): { name: string; description: string } | null {
  const src = text.replace(/^\uFEFF/, "");
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n[\s\S]*)?$/);
  if (!m) return null;
  const fields: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (/^\s/.test(line)) return null;
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) return null;
    fields[kv[1]] = unquoteYamlScalar(kv[2]);
  }
  const name = fields.name ?? "";
  const description = fields.description ?? "";
  if (!isValidSkillName(name)) return null;
  if (description.length < 1 || description.length > 1024) return null;
  return { name, description };
}

function unquoteYamlScalar(s: string): string {
  const t = s.trim();
  if (
    (t.startsWith('"') && t.endsWith('"') && t.length >= 2) ||
    (t.startsWith("'") && t.endsWith("'") && t.length >= 2)
  ) {
    return t.slice(1, -1);
  }
  return t;
}

export function skillRelPath(name: string): string {
  return `${SKILLS_DIR}/${name}/${SKILL_FILE}`;
}

export function bundledSkillsDir(): string {
  return join(import.meta.dir, "../../skills");
}

/** Copy packaged defaults into the workspace jail if missing. Does not overwrite. */
export function ensureDefaultSkills(workspaceRoot: string): void {
  const bundled = bundledSkillsDir();
  let dirs: string[];
  try {
    dirs = readdirSync(bundled, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return;
  }
  for (const name of dirs) {
    const src = join(bundled, name, SKILL_FILE);
    if (!existsSync(src)) continue;
    const destDir = join(workspaceRoot, SKILLS_DIR, name);
    const dest = join(destDir, SKILL_FILE);
    if (existsSync(dest)) continue;
    mkdirSync(destDir, { recursive: true });
    copyFileSync(src, dest);
  }
}

export function loadSkills(workspaceRoot: string): SkillMeta[] {
  const dir = join(workspaceRoot, SKILLS_DIR);
  let names: string[];
  try {
    names = readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }
  const skills: SkillMeta[] = [];
  for (const dirName of names) {
    const file = join(dir, dirName, SKILL_FILE);
    let st;
    try {
      st = statSync(file);
    } catch {
      continue;
    }
    if (!st.isFile() || st.size > MAX_SKILL_BYTES) continue;
    let text: string;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const parsed = parseSkillFrontmatter(text);
    if (!parsed || parsed.name !== dirName) continue;
    skills.push({
      name: parsed.name,
      description: parsed.description,
      path: skillRelPath(parsed.name),
    });
  }
  skills.sort((a, b) => a.name.localeCompare(b.name));
  return skills;
}

export function skillIndexPrompt(skills: SkillMeta[]): string {
  if (skills.length === 0) return "";
  const lines = skills.map(
    (s) => `- ${s.name} (${s.path}): ${s.description}`,
  );
  return `When a listed skill matches the user request, read_file its path and follow those instructions before improvising. Do not guess skill bodies.

Installed skills:
${lines.join("\n")}`;
}
