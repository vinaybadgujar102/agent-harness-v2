import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ConversationTurn } from "../abstraction/conversation";
import type { HarnessMode } from "../tools/subagentTool";

export const CONVERSATIONS_DB = ".tuffy/conversations.sqlite";
export const HISTORY_LIST_CAP = 50;
export const TITLE_MAX = 80;

export type ConversationRecord = {
  id: string;
  title: string;
  mode: HarnessMode;
  turns: ConversationTurn[];
  createdAt: number;
  updatedAt: number;
};

export type ConversationListItem = {
  id: string;
  title: string;
  mode: HarnessMode;
  updatedAt: number;
};

export function conversationsDbPath(workspaceRoot: string): string {
  return join(workspaceRoot, CONVERSATIONS_DB);
}

export function titleFromTurns(turns: ConversationTurn[]): string {
  const user = turns.find((t) => t.type === "user");
  const raw = user?.type === "user" ? user.content.trim().replace(/\s+/g, " ") : "";
  if (!raw) return "untitled";
  return raw.length > TITLE_MAX ? `${raw.slice(0, TITLE_MAX)}…` : raw;
}

function parseMode(value: string): HarnessMode {
  if (value === "plan" || value === "implement" || value === "agent") {
    return value;
  }
  return "agent";
}

function writeSqliteGitignore(dir: string) {
  const path = join(dir, ".gitignore");
  if (existsSync(path)) return;
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path,
    "conversations.sqlite\nconversations.sqlite-wal\nconversations.sqlite-shm\n",
  );
}

export class ConversationStore {
  private db: Database;

  constructor(workspaceRoot: string) {
    const path = conversationsDbPath(workspaceRoot);
    mkdirSync(dirname(path), { recursive: true });
    writeSqliteGitignore(dirname(path));
    this.db = new Database(path);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        mode TEXT NOT NULL,
        turns_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  }

  close() {
    this.db.close();
  }

  save(record: {
    id: string;
    mode: HarnessMode;
    turns: ConversationTurn[];
  }): void {
    if (record.turns.length === 0) return;
    const now = Date.now();
    const title = titleFromTurns(record.turns);
    const turnsJson = JSON.stringify(record.turns);
    this.db
      .query(
        `INSERT INTO conversations (id, title, mode, turns_json, created_at, updated_at)
         VALUES ($id, $title, $mode, $turns, $now, $now)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           mode = excluded.mode,
           turns_json = excluded.turns_json,
           updated_at = excluded.updated_at`,
      )
      .run({
        $id: record.id,
        $title: title,
        $mode: record.mode,
        $turns: turnsJson,
        $now: now,
      });
  }

  list(limit = HISTORY_LIST_CAP): ConversationListItem[] {
    const rows = this.db
      .query(
        `SELECT id, title, mode, updated_at
         FROM conversations
         ORDER BY updated_at DESC, rowid DESC
         LIMIT $limit`,
      )
      .all({ $limit: limit }) as Array<{
      id: string;
      title: string;
      mode: string;
      updated_at: number;
    }>;
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      mode: parseMode(row.mode),
      updatedAt: row.updated_at,
    }));
  }

  load(id: string): ConversationRecord | null {
    const row = this.db
      .query(
        `SELECT id, title, mode, turns_json, created_at, updated_at
         FROM conversations WHERE id = $id`,
      )
      .get({ $id: id }) as
      | {
          id: string;
          title: string;
          mode: string;
          turns_json: string;
          created_at: number;
          updated_at: number;
        }
      | null;
    if (!row) return null;
    let turns: ConversationTurn[];
    try {
      turns = JSON.parse(row.turns_json) as ConversationTurn[];
    } catch {
      return null;
    }
    if (!Array.isArray(turns)) return null;
    return {
      id: row.id,
      title: row.title,
      mode: parseMode(row.mode),
      turns,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  delete(id: string): void {
    this.db.query(`DELETE FROM conversations WHERE id = $id`).run({ $id: id });
  }
}
