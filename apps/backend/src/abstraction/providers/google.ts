import type { GoogleGenAI, Tool_2 } from "@google/genai";
import { toolRegistry, type Tool } from "../../tools/toolClass";
import { toGoogleSteps } from "../adapters/google";
import type { Conversation } from "../conversation";
import { AGENT_SYSTEM_PROMPT } from "../systemPrompt";
import type { InteractionStep, LLMProvider } from "../types";

export class GoogleAgentProvider implements LLMProvider {
  constructor(
    private googleClient: GoogleGenAI,
    private systemPrompt = AGENT_SYSTEM_PROMPT,
  ) {}

  private toGeminiTool(tool: Tool): Tool_2 {
    return {
      type: "function",
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    };
  }

  async converse(conversation: Conversation): Promise<InteractionStep> {
    const interaction = await this.googleClient.interactions.create({
      model: "gemini-2.5-flash",
      tools: [...toolRegistry.values()].map((t) => this.toGeminiTool(t)),
      system_instruction: this.systemPrompt,
      input: toGoogleSteps(conversation.getTurns()),
    });

    for (const step of interaction.steps) {
      if (step.type === "function_call") {
        return {
          type: "tool_call_needed",
          toolName: step.name,
          toolArgs: step.arguments,
          call_id: step.id,
        };
      }
    }

    const last = interaction.steps.at(-1)?.content[0].text;

    return {
      type: "message",
      text: last ?? "",
    };
  }
}
