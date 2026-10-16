# Lesson 0004 complete — second turn after function_result

User finished lesson 0004. Should recall: after `requires_action`, agent runs tool then starts a **new** streamed `interactions.create` with `input` containing prior user step(s) plus `function_result` (`call_id` matches function_call step id, result as text JSON). Turn 2 typically streams `model_output` text and ends `interaction.completed` with `completed`; `requires_action` on turn 2 means another tool round.

**Implications:** Can teach text-only path (thought vs model_output) or multi-tool loops; optional live two-turn spike if user wants evidence. Still no implementation default.
