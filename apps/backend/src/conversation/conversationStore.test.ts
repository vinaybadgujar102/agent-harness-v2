import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ConversationTurn } from "../abstraction/conversation";
import {
  ConversationStore,
  conversationsDbPath,
  HISTORY_LIST_CAP,
  titleFromTurns,
} from "./conversationStore";

const turns: ConversationTurn[] = [
  { type: "user", content: "  hello   world  " },
  { type: "assistant", content: "hi" },
];

test("title from first user turn", () => {
  expect(titleFromTurns(turns)).toBe("hello world");
  expect(titleFromTurns([])).toBe("untitled");
  expect(titleFromTurns([{ type: "user", content: "x".repeat(90) }])).toBe(
    `${"x".repeat(80)}…`,
  );
});

test("save skips empty; list load delete round-trip", async () => {
  const root = await mkdtemp(join(tmpdir(), "tuffy-conv-"));
  const store = new ConversationStore(root);
  try {
    store.save({ id: "a", mode: "agent", turns: [] });
    expect(store.list()).toEqual([]);

    store.save({ id: "a", mode: "plan", turns });
    const listed = store.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe("a");
    expect(listed[0]?.title).toBe("hello world");
    expect(listed[0]?.mode).toBe("plan");

    const loaded = store.load("a");
    expect(loaded?.turns).toEqual(turns);
    expect(loaded?.mode).toBe("plan");
    expect(loaded?.createdAt).toBeGreaterThan(0);

    store.delete("a");
    expect(store.load("a")).toBeNull();
    expect(store.list()).toEqual([]);

    const ignore = await Bun.file(join(root, ".tuffy/.gitignore")).text();
    expect(ignore).toContain("conversations.sqlite");
    expect(conversationsDbPath(root)).toContain(".tuffy/conversations.sqlite");
  } finally {
    store.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("list newest first and cap", async () => {
  const root = await mkdtemp(join(tmpdir(), "tuffy-conv-cap-"));
  const store = new ConversationStore(root);
  try {
    for (let i = 0; i < HISTORY_LIST_CAP + 3; i++) {
      store.save({
        id: `id-${i}`,
        mode: "agent",
        turns: [{ type: "user", content: `msg ${i}` }],
      });
    }
    const listed = store.list();
    expect(listed).toHaveLength(HISTORY_LIST_CAP);
    expect(listed[0]?.title).toBe(`msg ${HISTORY_LIST_CAP + 2}`);
  } finally {
    store.close();
    await rm(root, { recursive: true, force: true });
  }
});
