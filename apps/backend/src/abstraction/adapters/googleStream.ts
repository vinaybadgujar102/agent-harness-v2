import type {
  HarnessEvent,
  ProviderTurnStatus,
} from "../types";

/** Minimal Google Interactions SSE shape for mapping (no SDK import). */
export type GoogleInteractionSseEvent = {
  event_type?: string;
  index?: number;
  step?: { type?: string; id?: string; name?: string };
  delta?: {
    type?: string;
    text?: string;
    arguments?: string;
    content?: { text?: string };
    signature?: string;
  };
  interaction?: { id?: string; status?: string; usage?: unknown };
  error?: { message?: string; code?: string | number; status?: string };
};

type StepAccum = {
  stepType: string;
  id?: string;
  name?: string;
  argsFragments: string[];
};

export type GoogleStreamMapperState = {
  stepsByIndex: Map<number, StepAccum>;
  assistantText: string;
};

export function createGoogleStreamMapperState(): GoogleStreamMapperState {
  return { stepsByIndex: new Map(), assistantText: "" };
}

function toProviderTurnStatus(raw: string | undefined): ProviderTurnStatus {
  switch (raw) {
    case "completed":
    case "requires_action":
    case "failed":
    case "cancelled":
    case "incomplete":
      return raw;
    default:
      return "failed";
  }
}

/** Pure reducer: one SSE event → zero or more harness events. */
export function applyGoogleSseEvent(
  state: GoogleStreamMapperState,
  event: GoogleInteractionSseEvent,
): HarnessEvent[] {
  const out: HarnessEvent[] = [];
  const t = event.event_type ?? "";

  switch (t) {
    case "interaction.created":
      out.push({
        type: "turn_started",
        providerInteractionId: event.interaction?.id,
      });
      break;

    case "step.start": {
      const index = event.index;
      const step = event.step;
      if (index === undefined || !step?.type) break;
      state.stepsByIndex.set(index, {
        stepType: step.type,
        id: step.id,
        name: step.name,
        argsFragments: [],
      });
      break;
    }

    case "step.delta": {
      const index = event.index;
      const delta = event.delta;
      if (index === undefined || !delta?.type) break;
      const step = state.stepsByIndex.get(index);

      if (
        delta.type === "thought_summary" &&
        step?.stepType === "thought" &&
        delta.content?.text
      ) {
        out.push({ type: "thought_delta", text: delta.content.text });
      } else if (delta.type === "text" && delta.text && step?.stepType === "model_output") {
        state.assistantText += delta.text;
        out.push({ type: "text_delta", text: delta.text });
      } else if (delta.type === "arguments_delta" && step?.stepType === "function_call") {
        if (delta.arguments) step.argsFragments.push(delta.arguments);
      }
      break;
    }

    case "step.stop": {
      const index = event.index;
      if (index === undefined) break;
      const step = state.stepsByIndex.get(index);
      if (step?.stepType === "function_call" && step.name && step.id) {
        const raw = step.argsFragments.join("");
        let toolArgs: unknown = {};
        if (raw) {
          try {
            toolArgs = JSON.parse(raw) as unknown;
          } catch {
            out.push({
              type: "error",
              message: `Invalid tool arguments JSON for ${step.name}`,
              recoverable: false,
            });
            break;
          }
        }
        out.push({
          type: "tool_call_ready",
          toolName: step.name,
          call_id: step.id,
          toolArgs,
        });
      }
      break;
    }

    case "interaction.completed": {
      const status = toProviderTurnStatus(event.interaction?.status);
      if (status === "completed" && state.assistantText.length > 0) {
        out.push({ type: "message_complete", text: state.assistantText });
      }
      out.push({
        type: "turn_completed",
        status,
        usage: event.interaction?.usage,
      });
      break;
    }

    case "error":
      out.push({
        type: "error",
        message:
          event.error?.message ??
          event.error?.status ??
          "Provider stream error",
        recoverable: false,
      });
      break;

    default:
      break;
  }

  return out;
}

export async function* mapGoogleInteractionStream(
  stream: AsyncIterable<GoogleInteractionSseEvent>,
): AsyncGenerator<HarnessEvent> {
  const state = createGoogleStreamMapperState();
  try {
    for await (const event of stream) {
      for (const harnessEvent of applyGoogleSseEvent(state, event)) {
        yield harnessEvent;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    yield { type: "error", message, recoverable: false };
  }
}
