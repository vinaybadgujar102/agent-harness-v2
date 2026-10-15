import { expect, test } from "bun:test";
import { LovableAiAgent, type AgentProvider } from "./agent";
import type { Conversation } from "./conversation";
import type { ConverseStreamOptions, HarnessEvent } from "./types";

function hangingProvider(): AgentProvider {
  return {
    async converse() {
      return { type: "message", text: "nope" };
    },
    async *converseStream(
      _conversation: Conversation,
      options?: ConverseStreamOptions,
    ): AsyncIterable<HarnessEvent> {
      yield { type: "thought_delta", text: "thinking" };
      await new Promise<void>((resolve) => {
        if (options?.signal?.aborted) {
          resolve();
          return;
        }
        options?.signal?.addEventListener("abort", () => resolve(), {
          once: true,
        });
      });
    },
  };
}

function completeProvider(text: string): AgentProvider {
  return {
    async converse() {
      return { type: "message", text };
    },
    async *converseStream(): AsyncIterable<HarnessEvent> {
      yield { type: "text_delta", text };
      yield { type: "message_complete", text };
      yield { type: "turn_completed", status: "completed" };
    },
  };
}

test("abort rolls back the user turn", async () => {
  const agent = new LovableAiAgent(hangingProvider());
  const ac = new AbortController();
  const events: HarnessEvent[] = [];
  const run = (async () => {
    for await (const e of agent.createStream("do a thing", { signal: ac.signal })) {
      events.push(e);
    }
  })();
  await Bun.sleep(20);
  ac.abort();
  await run;
  expect(events.some((e) => e.type === "error" && e.message === "cancelled")).toBe(
    true,
  );
  expect(agent.getTurns()).toEqual([]);
});

test("message_complete is stored for the next turn", async () => {
  const agent = new LovableAiAgent(completeProvider("hello"));
  for await (const _ of agent.createStream("hi")) {
    // drain
  }
  expect(agent.getTurns()).toEqual([
    { type: "user", content: "hi" },
    { type: "assistant", content: "hello" },
  ]);
});
