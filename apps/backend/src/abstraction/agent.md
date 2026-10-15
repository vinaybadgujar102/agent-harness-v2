# LovableAiAgent loop

`LovableAiAgent` (`agent.ts`) runs one user prompt until the model returns a final message, a provider turn fails/cancels, or a stuck limit fires.

- `create(input)` — batch: `converse` until text; throws on a stuck limit.
- `createStream(input)` — yields `HarnessEvent`; on a stuck limit yields `{ type: "error", recoverable: false }` and stops.

Constructor: `new LovableAiAgent(provider, { maxStuck, maxRetriesPerTurn })`.

| Option | Default | Role |
|---|---|---|
| `maxRetriesPerTurn` | `2` | How many recoveries on the **current** turn or repeated step. |
| `maxStuck` | `8` | Run-wide cap on stuck recoveries. Hard stop even if the current turn still has retries left. |

A **new step** (different tool name or args) resets the per-turn retry counter. `maxStuck` never resets.

## What counts as stuck

Increment both counters, then retry the same conversation state (no tool record) when:

- `converse` throws
- stream ends without a usable outcome: no `turn_completed`, status `incomplete` or unexpected, `requires_action` with no `tool_call_ready`, or an `error` event without a clean `completed` turn

Increment both counters, then still execute the tool if under limits, when:

- the model asks for the **same** tool + args as the last executed call (repeated step)

Do **not** retry: `turn_completed` status `failed` or `cancelled` — the stream ends.

Limit check is `retriesThisTurn > maxRetriesPerTurn` first, then `stuckCount > maxStuck`. Messages: `Turn retry limit (N) exceeded` and `Hard stuck limit (N) exceeded`. Stream retries that are still under limit yield `{ type: "error", recoverable: true }` with a retry reason, then open another provider turn.
