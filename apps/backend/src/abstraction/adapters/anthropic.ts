import type { MessageParam } from "@anthropic-ai/sdk/resources/messages.mjs";
import type { ConversationTurn } from "../conversation";

export function toAnthropicMessages(turns: ConversationTurn[]): MessageParam[] {
  const messages: MessageParam[] = [];

  for (const turn of turns) {
    switch (turn.type) {
      case "user":
        messages.push({ role: "user", content: turn.content });
        break;
      case "tool_call":
        messages.push({
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: turn.callId,
              name: turn.toolName,
              input: turn.args as Record<string, unknown>,
            },
          ],
        });
        break;
      case "tool_result":
        messages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: turn.callId,
              content: JSON.stringify(turn.result),
            },
          ],
        });
        break;
    }
  }

  return messages;
}
