# Harness today is batch-only at the provider boundary

Established baseline for this repo (not yet user-tested): `LLMProvider` exposes `converse(conversation) => Promise<InteractionStep>`. Each call waits for the full provider response, then returns either `tool_call_needed` or final `message.text`. The agent loop uses that to run tools and call again. No streaming flags, no async iterables, no HTTP SSE layer.

**Implications:** Streaming work starts with a new outward contract (events or stream) while keeping “complete step” semantics for tool execution. Google can use `interactions.create({ stream: true })`; OpenAI/Anthropic need their native stream parsers before the loop sees a complete tool call.
