import type { GoogleGenAI, Interactions } from "@google/genai";
import { toolRegistry, type Tool } from "../../tools/toolClass";
import { lastModelTextFromSteps, toGoogleSteps } from "../adapters/google";
import {
  mapGoogleInteractionStream,
  type GoogleInteractionSseEvent,
} from "../adapters/googleStream";
import type { Conversation } from "../conversation";
import { AGENT_SYSTEM_PROMPT } from "../systemPrompt";
import type {
  HarnessEvent,
  InteractionStep,
  LLMProvider,
  StreamingLLMProvider,
} from "../types";

export class GoogleAgentProvider implements LLMProvider, StreamingLLMProvider {
  constructor(
    private googleClient: GoogleGenAI,
    private systemPrompt = AGENT_SYSTEM_PROMPT,
  ) {}

  private toGeminiTool(tool: Tool): Interactions.Tool {
    return {
      type: "function",
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    };
  }

  private interactionParams(conversation: Conversation) {
    return {
      model: "gemini-2.5-flash" as const,
      tools: [...toolRegistry.values()].map((t) => this.toGeminiTool(t)),
      system_instruction: this.systemPrompt,
      generation_config: { thinking_summaries: "auto" as const },
      input: toGoogleSteps(conversation.getTurns()),
    };
  }

  async converse(conversation: Conversation): Promise<InteractionStep> {
    const interaction = await this.googleClient.interactions.create(
      this.interactionParams(conversation),
    );

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

    return {
      type: "message",
      text: lastModelTextFromSteps(interaction.steps),
    };
  }

  async *converseStream(
    conversation: Conversation,
  ): AsyncGenerator<HarnessEvent> {
    const stream = await this.googleClient.interactions.create({
      ...this.interactionParams(conversation),
      stream: true,
    });
    yield* mapGoogleInteractionStream(
      stream as AsyncIterable<GoogleInteractionSseEvent>,
    );
  }
}
