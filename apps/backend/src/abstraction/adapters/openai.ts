import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import type { ResponseInput } from "openai/resources/responses/responses.mjs";
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

export function toOpenAiInput(turns: ConversationTurn[]): ResponseInput {
  const input: ResponseInput = [];

  for (const turn of turns) {
    switch (turn.type) {
      case "user":
        input.push({ role: "user", content: turn.content });
        break;
      case "tool_call":
        input.push({
          type: "function_call",
          call_id: turn.callId,
          name: turn.toolName,
          arguments:
            typeof turn.args === "string"
              ? turn.args
              : JSON.stringify(turn.args),
        });
        break;
      case "tool_result":
        input.push({
          type: "function_call_output",
          call_id: turn.callId,
          output: JSON.stringify(turn.result),
        });
        break;
    }
  }

  return input;
}
