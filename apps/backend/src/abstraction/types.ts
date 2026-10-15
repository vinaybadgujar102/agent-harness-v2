import type { Conversation } from "./conversation";

/** Terminal status on provider turn_completed (Google: interaction.completed.status). */
export type ProviderTurnStatus =
  | "completed"
  | "requires_action"
  | "failed"
  | "cancelled"
  | "incomplete";

/**
 * One unit emitted while a provider stream is open, or while the agent runs tools.
 * UI/subscribers consume this; vendor SSE must be mapped here first.
 */
export type HarnessEvent =
  | {
      type: "turn_started";
      /** Google interaction.id when available */
      providerInteractionId?: string;
    }
  | { type: "thought_delta"; text: string }
  | { type: "text_delta"; text: string }
  | {
      type: "tool_call_ready";
      toolName: string;
      call_id: string;
      toolArgs: unknown;
    }
  | { type: "message_complete"; text: string }
  | {
      type: "turn_completed";
      status: ProviderTurnStatus;
      usage?: unknown;
    }
  | { type: "tool_run_started"; toolName: string; call_id: string }
  | {
      type: "tool_run_finished";
      toolName: string;
      call_id: string;
      result: unknown;
    }
  | { type: "error"; message: string; recoverable?: boolean };

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

/** Streaming converse: yields HarnessEvent, ends after turn_completed or error. */
export type ConverseStreamOptions = {
  signal?: AbortSignal;
};

export interface StreamingLLMProvider {
  converseStream(
    conversation: Conversation,
    options?: ConverseStreamOptions,
  ): AsyncIterable<HarnessEvent>;
}

export function toolCallReadyToInteractionStep(
  e: Extract<HarnessEvent, { type: "tool_call_ready" }>,
): InteractionStep {
  return {
    type: "tool_call_needed",
    toolName: e.toolName,
    call_id: e.call_id,
    toolArgs: e.toolArgs,
  };
}

export function messageCompleteToInteractionStep(
  e: Extract<HarnessEvent, { type: "message_complete" }>,
): InteractionStep {
  return { type: "message", text: e.text };
}
