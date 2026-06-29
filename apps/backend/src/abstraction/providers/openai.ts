import type OpenAI from "openai";
import type { ChatCompletionTool } from "openai/resources/chat/completions.mjs";
import { toolRegistry, type Tool } from "../../tools/toolClass";
import { toChatMessages } from "../adapters/openai";
import type { Conversation } from "../conversation";
import { AGENT_SYSTEM_PROMPT } from "../systemPrompt";
import type { InteractionStep, LLMProvider } from "../types";

export class OpenAiProvider implements LLMProvider {
  constructor(
    private openAiClient: OpenAI,
    private systemPrompt = AGENT_SYSTEM_PROMPT,
  ) {}

  private toChatTool(tool: Tool): ChatCompletionTool {
    return {
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    };
  }

  async converse(conversation: Conversation): Promise<InteractionStep> {
    const completion = await this.openAiClient.chat.completions.create({
      model: "meta/llama-3.3-70b-instruct",
      messages: [
        { role: "system", content: this.systemPrompt },
        ...toChatMessages(conversation.getTurns()),
      ],
      tools: [...toolRegistry.values()].map((t) => this.toChatTool(t)),
      max_tokens: 1024,
    });

    const message = completion.choices[0]?.message;
    const toolCall = message?.tool_calls?.[0];

    if (toolCall?.type === "function") {
      return {
        type: "tool_call_needed",
        toolName: toolCall.function.name,
        call_id: toolCall.id,
        toolArgs: JSON.parse(toolCall.function.arguments),
      };
    }

    return {
      type: "message",
      text: message?.content ?? "",
    };
  }
}
