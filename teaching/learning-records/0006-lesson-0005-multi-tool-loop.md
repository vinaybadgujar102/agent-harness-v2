# Lesson 0005 complete — multi-tool loop

User finished lesson 0005. Should recall: each `requires_action` stream is one model turn; agent executes one tool and opens the next stream with accumulated `function_result` steps; two tools then a final answer typically means three streamed `create` calls; loop terminates on `message_complete` with `turn_completed` status `completed`, not on intermediate `tool_call_ready`.

**Implications:** Streaming course core (SSE, events, second turn, multi-tool) is largely covered. Natural follow-ups: text-only/thought path (4b), reference cheat sheet refresh, or pause until build mode.
