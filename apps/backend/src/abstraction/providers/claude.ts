import type Anthropic from "@anthropic-ai/sdk";
import type { LlmProviderOptions, Tool } from "../../tools/toolClass";
import { toAnthropicMessages } from "../adapters/anthropic";
import type { Conversation } from "../conversation";
import { AGENT_SYSTEM_PROMPT } from "../systemPrompt";
import type { InteractionStep, LLMProvider } from "../types";

export class ClaudeProvider implements LLMProvider {
  private systemPrompt: string;
  private tools: Tool[];

  constructor(
    private anthropic: Anthropic,
    options: LlmProviderOptions = {},
  ) {
    this.systemPrompt = options.systemPrompt ?? AGENT_SYSTEM_PROMPT;
    this.tools = options.tools ?? [];
  }

  private toClaudeTool(tool: Tool) {
    return {
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    };
  }

  async converse(conversation: Conversation): Promise<InteractionStep> {
    const response = await this.anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: this.systemPrompt,
      messages: toAnthropicMessages(conversation.getTurns()),
      ...(this.tools.length > 0
        ? { tools: this.tools.map((t) => this.toClaudeTool(t)) }
        : {}),
    });

    for (const block of response.content) {
      if (block.type === "tool_use") {
        return {
          type: "tool_call_needed",
          toolName: block.name,
          call_id: block.id,
          toolArgs: block.input,
        };
      }
    }

    const textBlock = response.content.find((block) => block.type === "text");

    return {
      type: "message",
      text: textBlock?.type === "text" ? textBlock.text : "",
    };
  }
}
