import { expect, test } from "bun:test";
import { takeUntilAbort } from "./abortIterable";

test("abort during wait unblocks without a chunk", async () => {
  async function* never() {
    await new Promise(() => {});
    yield "nope";
  }

  const ac = new AbortController();
  let yielded = false;
  const run = (async () => {
    for await (const _ of takeUntilAbort(never(), ac.signal)) {
      yielded = true;
    }
  })();
  await Bun.sleep(5);
  ac.abort();
  await run;
  expect(yielded).toBe(false);
});

test("abort stops a hanging source and runs its finally", async () => {
  let cleaned = false;
  async function* hanging() {
    try {
      yield "chunk";
      await new Promise(() => {});
    } finally {
      cleaned = true;
    }
  }

  const ac = new AbortController();
  const seen: string[] = [];
  const run = (async () => {
    for await (const item of takeUntilAbort(hanging(), ac.signal)) {
      seen.push(item);
      ac.abort();
    }
  })();

  await run;
  expect(seen).toEqual(["chunk"]);
  expect(cleaned).toBe(true);
});
