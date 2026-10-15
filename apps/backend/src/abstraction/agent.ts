import type { LlmProviderOptions, Tool } from "../tools/toolClass";
import { Conversation } from "./conversation";
import type {
  ConverseStreamOptions,
  HarnessEvent,
  LLMProvider,
  StreamingLLMProvider,
} from "./types";

export type AgentProvider = LLMProvider & StreamingLLMProvider;

const DEFAULT_MAX_STUCK = 8;
const DEFAULT_MAX_RETRIES_PER_TURN = 3;

export type AgentLoopOptions = {
  maxStuck?: number;
  maxRetriesPerTurn?: number;
  tools?: Tool[];
};

type PendingTool = Extract<HarnessEvent, { type: "tool_call_ready" }>;
type TurnCompleted = Extract<HarnessEvent, { type: "turn_completed" }>;

function stepKey(toolName: string, toolArgs: unknown): string {
  return `${toolName}:${JSON.stringify(toolArgs)}`;
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

type Stuck = {
  count: number;
  retriesThisTurn: number;
  lastStep: string | null;
};

function newStuck(): Stuck {
  return { count: 0, retriesThisTurn: 0, lastStep: null };
}

export class LovableAiAgent {
  private provider: AgentProvider;
  private conversation = new Conversation();
  private maxStuck: number;
  private maxRetriesPerTurn: number;
  private tools: Map<string, Tool>;

  constructor(provider: AgentProvider, options: AgentLoopOptions = {}) {
    this.provider = provider;
    this.maxStuck = options.maxStuck ?? DEFAULT_MAX_STUCK;
    this.maxRetriesPerTurn =
      options.maxRetriesPerTurn ?? DEFAULT_MAX_RETRIES_PER_TURN;
    this.tools = new Map((options.tools ?? []).map((t) => [t.name, t]));
  }

  clearConversation() {
    this.conversation.clear();
  }

  setMode(options: LlmProviderOptions) {
    if (options.tools !== undefined) {
      this.tools = new Map(options.tools.map((t) => [t.name, t]));
    }
    const provider = this.provider as AgentProvider & {
      setLlmOptions?(o: LlmProviderOptions): void;
    };
    provider.setLlmOptions?.(options);
  }

  getTurns() {
    return this.conversation.getTurns();
  }

  private stuckLimit(stuck: Stuck): string | null {
    if (stuck.retriesThisTurn > this.maxRetriesPerTurn) {
      return `Turn retry limit (${this.maxRetriesPerTurn}) exceeded`;
    }
    if (stuck.count > this.maxStuck) {
      return `Hard stuck limit (${this.maxStuck}) exceeded`;
    }
    return null;
  }

  private bumpStuck(stuck: Stuck): string | null {
    stuck.count += 1;
    stuck.retriesThisTurn += 1;
    return this.stuckLimit(stuck);
  }

  private observeStep(stuck: Stuck, key: string): string | null {
    if (key === stuck.lastStep) return this.bumpStuck(stuck);
    stuck.lastStep = key;
    stuck.retriesThisTurn = 0;
    return null;
  }

  private async executeTool(name: string, args: unknown): Promise<unknown> {
    const tool = this.tools.get(name);
    return tool ? tool.execute(args) : { error: "tool not found" };
  }

  private cancelledEvent(): HarnessEvent {
    return { type: "error", message: "cancelled", recoverable: true };
  }

  async create(input: string) {
    this.conversation.start(input);

    const stuck = newStuck();

    while (true) {
      let response;
      while (true) {
        try {
          response = await this.provider.converse(this.conversation);
          break;
        } catch (err) {
          const message = this.bumpStuck(stuck);
          if (message) {
            const detail = err instanceof Error ? err.message : String(err);
            throw new Error(`${message}: ${detail}`);
          }
        }
      }

      if (response.type === "tool_call_needed") {
        const message = this.observeStep(
          stuck,
          stepKey(response.toolName, response.toolArgs),
        );
        if (message) {
          throw new Error(`${message} at ${response.toolName}`);
        }

        this.conversation.recordToolCall(
          response.toolName,
          response.call_id,
          response.toolArgs,
        );

        const result = await this.executeTool(
          response.toolName,
          response.toolArgs,
        );

        this.conversation.addToolResult(
          response.toolName,
          response.call_id,
          result,
        );
        continue;
      }

      if (response.text) this.conversation.recordAssistant(response.text);
      return response.text;
    }
  }

  async *createStream(
    input: string,
    options?: ConverseStreamOptions,
  ): AsyncIterable<HarnessEvent> {
    const signal = options?.signal;
    const mark = this.conversation.mark();
    this.conversation.start(input);

    const rollbackIfAborted = (): boolean => {
      if (!signal?.aborted) return false;
      this.conversation.restore(mark);
      return true;
    };

    const stuck = newStuck();

    while (true) {
      if (rollbackIfAborted()) {
        yield this.cancelledEvent();
        return;
      }

      let pendingTool: PendingTool | null = null;
      let turnStatus: TurnCompleted | null = null;
      let sawError = false;

      try {
        for await (const event of this.provider.converseStream(
          this.conversation,
          { signal },
        )) {
          if (rollbackIfAborted()) {
            yield this.cancelledEvent();
            return;
          }
          if (event.type === "message_complete" && event.text) {
            this.conversation.recordAssistant(event.text);
          }
          yield event;
          if (event.type === "tool_call_ready") pendingTool = event;
          if (event.type === "turn_completed") turnStatus = event;
          if (event.type === "error") sawError = true;
        }
      } catch (err) {
        if (rollbackIfAborted() || isAbortError(err)) {
          this.conversation.restore(mark);
          yield this.cancelledEvent();
          return;
        }
        throw err;
      }

      if (rollbackIfAborted()) {
        yield this.cancelledEvent();
        return;
      }

      if (
        turnStatus?.status === "failed" ||
        turnStatus?.status === "cancelled"
      ) {
        return;
      }

      const toolReady =
        pendingTool !== null && turnStatus?.status === "requires_action";
      const completed = turnStatus?.status === "completed";

      if (completed && !sawError) {
        return;
      }

      if (toolReady && pendingTool) {
        const message = this.observeStep(
          stuck,
          stepKey(pendingTool.toolName, pendingTool.toolArgs),
        );
        if (message) {
          yield {
            type: "error",
            message: `${message} at ${pendingTool.toolName}`,
            recoverable: false,
          };
          return;
        }

        this.conversation.recordToolCall(
          pendingTool.toolName,
          pendingTool.call_id,
          pendingTool.toolArgs,
        );

        yield {
          type: "tool_run_started",
          toolName: pendingTool.toolName,
          call_id: pendingTool.call_id,
        };

        const result = await this.executeTool(
          pendingTool.toolName,
          pendingTool.toolArgs,
        );

        yield {
          type: "tool_run_finished",
          toolName: pendingTool.toolName,
          call_id: pendingTool.call_id,
          result,
        };

        this.conversation.addToolResult(
          pendingTool.toolName,
          pendingTool.call_id,
          result,
        );
        continue;
      }

      const overLimit = this.bumpStuck(stuck);
      yield {
        type: "error",
        message:
          overLimit ??
          (turnStatus
            ? `Unexpected turn status: ${turnStatus.status}; retrying`
            : "Provider stream ended without turn_completed; retrying"),
        recoverable: !overLimit,
      };
      if (overLimit) return;
    }
  }
}
