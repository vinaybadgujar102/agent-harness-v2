export type ConversationTurn =
  | { type: "user"; content: string }
  | { type: "assistant"; content: string }
  | { type: "tool_call"; toolName: string; callId: string; args: unknown }
  | { type: "tool_result"; toolName: string; callId: string; result: unknown };

export class Conversation {
  private turns: ConversationTurn[] = [];

  mark(): number {
    return this.turns.length;
  }

  restore(mark: number) {
    this.turns.length = mark;
  }

  clear() {
    this.turns = [];
  }

  start(prompt: string) {
    this.turns.push({ type: "user", content: prompt });
  }

  recordAssistant(content: string) {
    this.turns.push({ type: "assistant", content });
  }

  recordToolCall(toolName: string, callId: string, args: unknown) {
    this.turns.push({ type: "tool_call", toolName, callId, args });
  }

  addToolResult(toolName: string, callId: string, result: unknown) {
    this.turns.push({ type: "tool_result", toolName, callId, result });
  }

  getTurns(): ConversationTurn[] {
    return this.turns;
  }
}
