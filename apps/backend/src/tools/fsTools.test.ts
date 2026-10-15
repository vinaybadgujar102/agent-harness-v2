import { expect, test } from "bun:test";
import { mkdtemp, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFsTools, MAX_READ_BYTES } from "./fsTools";
import { resolveWorkspacePath } from "./workspacePath";

async function tmpDir() {
  return mkdtemp(join(tmpdir(), "tuffy-fs-"));
}

function tool(name: string, tools: ReturnType<typeof createFsTools>) {
  const t = tools.find((x) => x.name === name);
  if (!t) throw new Error(`missing ${name}`);
  return t;
}

test("resolve rejects path outside workspace", async () => {
  const root = await tmpDir();
  const escaped = await resolveWorkspacePath(root, "../secret");
  expect(escaped.ok).toBe(false);
});

test("read/write/list stay in workspace", async () => {
  const root = await tmpDir();
  const tools = createFsTools(root);
  const write = tool("write_file", tools);
  const read = tool("read_file", tools);
  const list = tool("list_dir", tools);

  const written = await write.execute({
    path: "src/a.txt",
    content: "hello",
  });
  expect(written).toMatchObject({ written: 5 });

  const got = (await read.execute({ path: "src/a.txt" })) as {
    content: string;
  };
  expect(got.content).toBe("hello");

  const listing = (await list.execute({ path: "src" })) as {
    entries: { name: string; type: string }[];
  };
  expect(listing.entries.some((e) => e.name === "a.txt")).toBe(true);

  const outside = await write.execute({
    path: "../escape.txt",
    content: "nope",
  });
  expect(outside).toEqual({ error: "path is outside the workspace" });
});

test("symlink target outside workspace is rejected", async () => {
  const root = await tmpDir();
  const outside = join(root, "..", `outside-${Date.now()}.txt`);
  await Bun.write(outside, "secret");
  await symlink(outside, join(root, "link.txt"));
  const tools = createFsTools(root);
  const read = tool("read_file", tools);
  const result = await read.execute({ path: "link.txt" });
  expect(result).toEqual({ error: "path is outside the workspace" });
});

test("read rejects oversize files", async () => {
  const root = await tmpDir();
  const big = join(root, "big.txt");
  await Bun.write(big, "x".repeat(MAX_READ_BYTES + 1));
  const read = tool("read_file", createFsTools(root));
  const result = await read.execute({ path: "big.txt" });
  expect(result).toEqual({
    error: `file larger than ${MAX_READ_BYTES} bytes`,
  });
});
