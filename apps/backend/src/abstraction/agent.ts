import { toolRegistry } from "../tools/toolClass";
import { Conversation } from "./conversation";
import type { LLMProvider } from "./types";

export class LovableAiAgent {
  private provider: LLMProvider;
  private conversation = new Conversation();

  constructor(provider: LLMProvider) {
    this.provider = provider;
  }

  async create(input: string) {
    this.conversation.start(input);

    while (true) {
      const response = await this.provider.converse(this.conversation);

      if (response.type === "tool_call_needed") {
        this.conversation.recordToolCall(
          response.toolName,
          response.call_id,
          response.toolArgs,
        );

        const tool = toolRegistry.get(response.toolName);
        const result = tool
          ? await tool.execute(response.toolArgs)
          : { error: "tool not found" };

        this.conversation.addToolResult(
          response.toolName,
          response.call_id,
          result,
        );
        continue;
      }

      return response.text;
    }
  }
}
