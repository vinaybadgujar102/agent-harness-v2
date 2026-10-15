import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import type { ConversationTurn } from "../conversation";

export function toChatMessages(
  turns: ConversationTurn[],
): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [];

  for (const turn of turns) {
    switch (turn.type) {
      case "user":
        messages.push({ role: "user", content: turn.content });
        break;
      case "assistant":
        messages.push({ role: "assistant", content: turn.content });
        break;
      case "tool_call":
        messages.push({
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: turn.callId,
              type: "function",
              function: {
                name: turn.toolName,
                arguments:
                  typeof turn.args === "string"
                    ? turn.args
                    : JSON.stringify(turn.args),
              },
            },
          ],
        });
        break;
      case "tool_result":
        messages.push({
          role: "tool",
          tool_call_id: turn.callId,
          content: JSON.stringify(turn.result),
        });
        break;
    }
  }

  return messages;
}
