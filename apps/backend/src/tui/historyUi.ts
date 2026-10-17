import type { ConversationTurn } from "../abstraction/conversation";

export const TOOL_RESULT_PREVIEW = 240;

export type HistoryLine = {
  kind: "user" | "assistant" | "tool";
  text: string;
};

export function previewToolResult(result: unknown): string {
  const raw = JSON.stringify(result);
  return raw.length > TOOL_RESULT_PREVIEW
    ? `${raw.slice(0, TOOL_RESULT_PREVIEW)}…`
    : raw;
}

export function relativeTime(updatedAt: number, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - updatedAt) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function transcriptLinesFromTurns(
  turns: ConversationTurn[],
): HistoryLine[] {
  const lines: HistoryLine[] = [];
  for (const turn of turns) {
    if (turn.type === "user") {
      lines.push({ kind: "user", text: turn.content });
    } else if (turn.type === "assistant") {
      lines.push({ kind: "assistant", text: turn.content });
    } else if (turn.type === "tool_call") {
      lines.push({ kind: "tool", text: `${turn.toolName} …` });
    } else {
      lines.push({
        kind: "tool",
        text: `${turn.toolName} done ${previewToolResult(turn.result)}`,
      });
    }
  }
  return lines;
}

export function visibleWindow<T>(
  items: T[],
  pick: number,
  height: number,
): { start: number; items: T[] } {
  if (height <= 0 || items.length === 0) return { start: 0, items: [] };
  if (items.length <= height) return { start: 0, items };
  const start = Math.min(
    Math.max(0, pick - Math.floor(height / 2)),
    items.length - height,
  );
  return { start, items: items.slice(start, start + height) };
}
