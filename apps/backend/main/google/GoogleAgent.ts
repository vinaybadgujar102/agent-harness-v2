import type { Step, ToolCall } from "@google/genai";
import { client } from "../../src/client";
import { planningTasksFunction } from "../../src/tools/planningTasks.tool";
import { bashTool } from "../../src/tools/bash.tool";

export type InteractionState =
  | {
      type: "waiting_for_tool";
      callId: string;
      name: string;
      arguments: unknown;
    }
  | {
      type: "completed";
      text: string;
    };

export function createGoogleInteraction() {
  const history: Step[] = [];

  async function start(prompt: string) {
    history.push({
      type: "user_input",
      content: [{ type: "text", text: prompt }],
    });
  }

  async function advance(): Promise<InteractionState> {
    const interaction = await client.interactions.create({
      model: "gemini-2.5-flash",
      tools: [],
      input: history,
      system_instruction: "you are an helpful agent",
    });

    for (const step of interaction.steps) {
      if (step.type === "function_call") {
        return {
          type: "waiting_for_tool",
          callId: step.id,
          name: step.name,
          arguments: step.arguments,
        };
      }
    }

    const last = interaction.steps.at(-1)?.content[0].text;

    return {
      type: "completed",
      text: last,
    };
  }

  function submitToolResult(name: string, call_id: string, result: unknown) {
    history.push({
      type: "function_result",
      name: name,
      result: [{ type: "text", text: JSON.stringify(result) }],
      call_id: call_id,
    });
  }
  return {
    start,
    advance,
    submitToolResult,
  };
}

const toolRegistry = new Map([
  ["planning_tasks", planningTasksFunction],
  ["bash_tool", bashTool],
]);

async function executeTool(toolName: string, args: unknown) {
  const tool = toolRegistry.get(toolName);

  if (!tool) {
    throw new Error("tool not found");
  }

  return tool(args);
}

export async function agentLoop(prompt: string) {
  // create intitial input state
  const interaction = createGoogleInteraction();
  interaction.start(prompt);

  while (true) {
    const state = await interaction.advance();

    if (state.type === "waiting_for_tool") {
      const result = await executeTool(state.name, state.arguments);
      interaction.submitToolResult(state.name, state.callId, result);
      continue;
    }

    return state.text;
  }
}
