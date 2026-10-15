import type { Interactions } from "@google/genai";
import type { ConversationTurn } from "../conversation";

export function toGoogleSteps(turns: ConversationTurn[]): Interactions.Step[] {
  const steps: Interactions.Step[] = [];

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

export function lastModelTextFromSteps(steps: Interactions.Step[]): string {
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i];
    if (step?.type !== "model_output" || !step.content) continue;

    for (const block of step.content) {
      if (block.type === "text") return block.text;
    }
  }

  return "";
}
