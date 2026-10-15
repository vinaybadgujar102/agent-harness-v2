import { mkdir, readdir, stat } from "node:fs/promises";
import { dirname } from "node:path";
import type { Tool } from "./toolClass";
import { resolveWorkspacePath } from "./workspacePath";

export const MAX_READ_BYTES = 256 * 1024;

function strArg(args: unknown, key: string): string | undefined {
  if (typeof args !== "object" || args === null) return undefined;
  const value = (args as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

async function jail(
  workspaceRoot: string,
  userPath: string,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  return resolveWorkspacePath(workspaceRoot, userPath);
}

export function createFsTools(workspaceRoot: string): Tool[] {
  return [
    {
      name: "read_file",
      description:
        "Read a UTF-8 text file inside the workspace. Path may be relative or absolute if it stays in the workspace. Max 256KiB.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path" },
        },
        required: ["path"],
      },
      async execute(args) {
        const path = strArg(args, "path");
        if (path === undefined) return { error: "path is required" };
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
    },
    {
      name: "write_file",
      description:
        "Write a UTF-8 text file inside the workspace. Overwrites. Creates parent directories.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path" },
          content: { type: "string", description: "File contents" },
        },
        required: ["path", "content"],
      },
      async execute(args) {
        const path = strArg(args, "path");
        const content = strArg(args, "content");
        if (path === undefined) return { error: "path is required" };
        if (content === undefined) return { error: "content is required" };
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
    },
    {
      name: "list_dir",
      description:
        "List one directory level inside the workspace. Includes dotfiles. Does not recurse.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Directory path (default .)",
          },
        },
      },
      async execute(args) {
        const path = strArg(args, "path") ?? ".";
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
    },
  ];
}
