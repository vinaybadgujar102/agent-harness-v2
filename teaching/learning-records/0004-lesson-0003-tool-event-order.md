# Lesson 0003 complete — tool run event order

User finished lesson 0003 (quiz on `--tools` spike). Should reliably recall: `interaction.completed` with `requires_action` after `function_call`; harness order `tool_call_ready` then `turn_completed`; tool-only turn may have no `model_output` / no user-visible text deltas.

**Implications:** ZPD moves past raw SSE timeline toward “what happens after `requires_action`” (function_result + next turn) or text-only path with thought vs model_output — still teach/reference, not implementation unless requested.
