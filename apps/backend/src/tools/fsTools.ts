import { mkdir, readdir, stat } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { defineTool } from "./toolClass";
import { resolveWorkspacePath } from "./workspacePath";

export const MAX_READ_BYTES = 256 * 1024;

async function jail(
  workspaceRoot: string,
  userPath: string,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  return resolveWorkspacePath(workspaceRoot, userPath);
}

const readFileInput = z.object({
  path: z.string().describe("File path"),
});

const writeFileInput = z.object({
  path: z.string().describe("File path"),
  content: z.string().describe("File contents"),
});

const listDirInput = z.object({
  path: z
    .string()
    .optional()
    .describe("Directory path (default .)"),
});

export function createFsTools(
  workspaceRoot: string,
  options?: { writable?: boolean },
) {
  const tools = [
    defineTool({
      name: "read_file",
      description:
        "Read a UTF-8 text file inside the workspace. Path may be relative or absolute if it stays in the workspace. Max 256KiB.",
      input: readFileInput,
      async execute({ path }) {
        const resolved = await jail(workspaceRoot, path);
        if (!resolved.ok) return { error: resolved.error };
        let info;
        try {
          info = await stat(resolved.path);
        } catch {
          return { error: "path not found" };
        }
        if (info.isDirectory()) return { error: "path is a directory" };
        if (info.size > MAX_READ_BYTES) {
          return { error: `file larger than ${MAX_READ_BYTES} bytes` };
        }
        const buf = await Bun.file(resolved.path).arrayBuffer();
        if (buf.byteLength > MAX_READ_BYTES) {
          return { error: `file larger than ${MAX_READ_BYTES} bytes` };
        }
        try {
          const content = new TextDecoder("utf-8", { fatal: true }).decode(buf);
          return { path: resolved.path, content };
        } catch {
          return { error: "file is not valid UTF-8 text" };
        }
      },
    }),
    defineTool({
      name: "write_file",
      description:
        "Write a UTF-8 text file inside the workspace. Overwrites. Creates parent directories.",
      input: writeFileInput,
      async execute({ path, content }) {
        const resolved = await jail(workspaceRoot, path);
        if (!resolved.ok) return { error: resolved.error };
        try {
          const info = await stat(resolved.path);
          if (info.isDirectory()) return { error: "path is a directory" };
        } catch {
          // missing file is fine
        }
        await mkdir(dirname(resolved.path), { recursive: true });
        await Bun.write(resolved.path, content);
        return { path: resolved.path, written: content.length };
      },
    }),
    defineTool({
      name: "list_dir",
      description:
        "List one directory level inside the workspace. Includes dotfiles. Does not recurse.",
      input: listDirInput,
      async execute({ path = "." }) {
        const resolved = await jail(workspaceRoot, path);
        if (!resolved.ok) return { error: resolved.error };
        let info;
        try {
          info = await stat(resolved.path);
        } catch {
          return { error: "path not found" };
        }
        if (!info.isDirectory()) return { error: "path is not a directory" };
        const entries = await readdir(resolved.path, { withFileTypes: true });
        return {
          path: resolved.path,
          entries: entries
            .filter((e) => e.name !== "." && e.name !== "..")
            .map((e) => ({
              name: e.name,
              type: e.isDirectory() ? "dir" : "file",
            })),
        };
      },
    }),
  ];
  if (options?.writable === false) {
    return tools.filter((t) => t.name !== "write_file");
  }
  return tools;
}
