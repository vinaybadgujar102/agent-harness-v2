import { realpath } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";

export function isPathInsideRoot(rootReal: string, target: string): boolean {
  const root = rootReal.endsWith(sep) ? rootReal : rootReal + sep;
  return target === rootReal || target.startsWith(root);
}

export type ResolvedPath =
  | { ok: true; path: string }
  | { ok: false; error: string };

export async function resolveWorkspacePath(
  workspaceRoot: string,
  userPath: string,
): Promise<ResolvedPath> {
  let rootReal: string;
  try {
    rootReal = await realpath(workspaceRoot);
  } catch {
    return { ok: false, error: "workspace root does not exist" };
  }

  const requested = userPath.trim() === "" ? "." : userPath;
  const abs = isAbsolute(requested)
    ? resolve(requested)
    : resolve(rootReal, requested);

  const missing: string[] = [];
  let probe = abs;
  while (true) {
    try {
      const existingReal = await realpath(probe);
      let candidate = existingReal;
      for (let i = missing.length - 1; i >= 0; i--) {
        const part = missing[i];
        if (part) candidate = join(candidate, part);
      }
      candidate = resolve(candidate);
      if (!isPathInsideRoot(rootReal, candidate)) {
        return { ok: false, error: "path is outside the workspace" };
      }
      return { ok: true, path: candidate };
    } catch {
      const parent = dirname(probe);
      if (parent === probe) {
        return { ok: false, error: "path is outside the workspace" };
      }
      missing.push(basename(probe));
      probe = parent;
    }
  }
}
