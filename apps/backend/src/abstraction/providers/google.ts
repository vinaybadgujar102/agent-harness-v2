import type { GoogleGenAI, Interactions } from "@google/genai";
import type { LlmProviderOptions, Tool } from "../../tools/toolClass";
import { lastModelTextFromSteps, toGoogleSteps } from "../adapters/google";
import {
  mapGoogleInteractionStream,
  type GoogleInteractionSseEvent,
} from "../adapters/googleStream";
import { takeUntilAbort } from "../abortIterable";
import type { Conversation } from "../conversation";
import { AGENT_SYSTEM_PROMPT } from "../systemPrompt";
import type {
  ConverseStreamOptions,
  HarnessEvent,
  InteractionStep,
  LLMProvider,
  StreamingLLMProvider,
} from "../types";

export class GoogleAgentProvider implements LLMProvider, StreamingLLMProvider {
  private systemPrompt: string;
  private tools: Tool[];

  constructor(
    private googleClient: GoogleGenAI,
    options: LlmProviderOptions = {},
  ) {
    this.systemPrompt = options.systemPrompt ?? AGENT_SYSTEM_PROMPT;
    this.tools = options.tools ?? [];
  }

  setLlmOptions(options: LlmProviderOptions) {
    if (options.systemPrompt !== undefined) {
      this.systemPrompt = options.systemPrompt;
    }
    if (options.tools !== undefined) {
      this.tools = options.tools;
    }
  }

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
      ...(this.tools.length > 0
        ? { tools: this.tools.map((t) => this.toGeminiTool(t)) }
        : {}),
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
    options?: ConverseStreamOptions,
  ): AsyncGenerator<HarnessEvent> {
    const stream = await this.googleClient.interactions.create({
      ...this.interactionParams(conversation),
      stream: true,
    });
    const events = takeUntilAbort(
      stream as AsyncIterable<GoogleInteractionSseEvent>,
      options?.signal,
    );
    yield* mapGoogleInteractionStream(events);
  }
}
