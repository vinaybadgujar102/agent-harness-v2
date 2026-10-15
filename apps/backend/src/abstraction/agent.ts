import { toolRegistry } from "../tools/toolClass";
import { Conversation } from "./conversation";
import type {
  HarnessEvent,
  LLMProvider,
  StreamingLLMProvider,
} from "./types";

export type AgentProvider = LLMProvider & StreamingLLMProvider;

export class LovableAiAgent {
  private provider: AgentProvider;
  private conversation = new Conversation();

  constructor(provider: AgentProvider) {
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

  async *createStream(input: string): AsyncIterable<HarnessEvent> {
    this.conversation.start(input);

    while (true) {
      let pendingTool: Extract<
        HarnessEvent,
        { type: "tool_call_ready" }
      > | null = null;
      let turnStatus: HarnessEvent & { type: "turn_completed" } | null = null;

      for await (const event of this.provider.converseStream(this.conversation)) {
        yield event;

        if (event.type === "tool_call_ready") pendingTool = event;
        if (event.type === "turn_completed") turnStatus = event;
        if (event.type === "error") return;
      }

      if (!turnStatus) {
        yield {
          type: "error",
          message: "Provider stream ended without turn_completed",
          recoverable: false,
        };
        return;
      }

      if (turnStatus.status === "failed" || turnStatus.status === "cancelled") {
        return;
      }

      if (pendingTool && turnStatus.status === "requires_action") {
        this.conversation.recordToolCall(
          pendingTool.toolName,
          pendingTool.call_id,
          pendingTool.toolArgs,
        );

        yield {
          type: "tool_run_started",
          toolName: pendingTool.toolName,
          call_id: pendingTool.call_id,
        };

        const tool = toolRegistry.get(pendingTool.toolName);
        const result = tool
          ? await tool.execute(pendingTool.toolArgs)
          : { error: "tool not found" };

        yield {
          type: "tool_run_finished",
          toolName: pendingTool.toolName,
          call_id: pendingTool.call_id,
          result,
        };

        this.conversation.addToolResult(
          pendingTool.toolName,
          pendingTool.call_id,
          result,
        );
        continue;
      }

      if (turnStatus.status === "completed") {
        return;
      }

      yield {
        type: "error",
        message: `Unexpected turn status: ${turnStatus.status}`,
        recoverable: false,
      };
      return;
    }
  }
}
