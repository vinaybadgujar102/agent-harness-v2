export type ConversationTurn =
  | { type: "user"; content: string }
  | { type: "tool_call"; toolName: string; callId: string; args: unknown }
  | { type: "tool_result"; toolName: string; callId: string; result: unknown };

export class Conversation {
  private turns: ConversationTurn[] = [];

  start(prompt: string) {
    this.turns.push({ type: "user", content: prompt });
  }

  addUserMessage(text: string) {
    this.turns.push({ type: "user", content: text });
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
