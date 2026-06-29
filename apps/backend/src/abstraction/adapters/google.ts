import type { Step } from "@google/genai";
import type { ConversationTurn } from "../conversation";

export function toGoogleSteps(turns: ConversationTurn[]): Step[] {
  const steps: Step[] = [];

  for (const turn of turns) {
    switch (turn.type) {
      case "user":
        steps.push({
          type: "user_input",
          content: [{ type: "text", text: turn.content }],
        });
        break;
      case "tool_result":
        steps.push({
          type: "function_result",
          call_id: turn.callId,
          name: turn.toolName,
          result: [{ type: "text", text: JSON.stringify(turn.result) }],
        });
        break;
    }
  }

  return steps;
}
