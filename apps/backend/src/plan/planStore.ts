import { mkdir } from "node:fs/promises";
import { join } from "node:path";

export const PLAN_DIR = ".tuffy/plans";
export const ACTIVE_PLAN_FILE = "active.md";

export function activePlanPath(workspaceRoot: string): string {
  return join(workspaceRoot, PLAN_DIR, ACTIVE_PLAN_FILE);
}

export async function saveActivePlan(
  workspaceRoot: string,
  content: string,
): Promise<void> {
  const dir = join(workspaceRoot, PLAN_DIR);
  await mkdir(dir, { recursive: true });
  await Bun.write(join(dir, ACTIVE_PLAN_FILE), content.trimEnd() + "\n");
}

export async function loadActivePlan(
  workspaceRoot: string,
): Promise<string | null> {
  const path = activePlanPath(workspaceRoot);
  const file = Bun.file(path);
  if (!(await file.exists())) return null;
  const text = await file.text();
  return text.trim() ? text : null;
}

export function implementationUserPrompt(plan: string): string {
  return `Implement the plan below. Update ${PLAN_DIR}/${ACTIVE_PLAN_FILE} as you work: current step \`- [~]\`, finished \`- [x]\`, others \`- [ ]\`.

${plan.trim()}`;
}
