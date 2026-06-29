import type { Conversation } from "./conversation";

export type InteractionStep =
  | {
      type: "tool_call_needed";
      toolName: string;
      call_id: string;
      toolArgs: unknown;
    }
  | {
      type: "message";
      text: string;
    };

export interface LLMProvider {
  converse(conversation: Conversation): Promise<InteractionStep>;
}
