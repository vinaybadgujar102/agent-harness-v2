# Google Interactions SSE — observed on real spike runs

User ran `google-interactions-sse-walkthrough.ts` (text-only and `--tools`). Confirmed event order: `interaction.created` → optional `interaction.status_update` → `(step.start → step.delta* → step.stop)+` → `interaction.completed`.

**Text path:** index 0 `thought` with `thought_signature` delta (no user text). index 1 `model_output` streams `text` deltas inline. Usage showed large `total_thought_tokens` vs small output tokens on a trivial prompt.

**Tool path:** after thought, index 1 `function_call`; `arguments_delta` arrived as one JSON string (may be multi-chunk in other calls). Final event was `interaction.completed` with **`status: "requires_action"`**, not `completed` — harness must treat that as “tool_call_needed, do not treat as final assistant message.”

**Implications:** Ignore or optionally surface thought steps; never assume `interaction.completed.status === "completed"` before running tools; accumulate args until `step.stop` even when one delta holds full JSON.
