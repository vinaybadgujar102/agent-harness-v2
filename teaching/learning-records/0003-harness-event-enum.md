# HarnessEvent enum agreed for streaming

Defined in `types.ts`: provider events (`turn_started`, `text_delta`, `tool_call_ready`, `message_complete`, `turn_completed`, `error`) plus agent events (`tool_run_started`, `tool_run_finished`). `tool_call_ready` aligns with existing `InteractionStep` tool branch via `toolCallReadyToInteractionStep`.

Google mapping validated against user traces: `requires_action` on `turn_completed` pairs with prior `tool_call_ready`; text path ends with `completed` and `message_complete` after model_output deltas. Thought steps stay out of enum on purpose.

**Implications:** Implement `StreamingLLMProvider.converseStream` next on Google only; batch `LLMProvider.converse` can remain until migrated.
