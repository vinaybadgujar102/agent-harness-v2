import type { HarnessEvent } from "../abstraction/types";

export function harnessEventToSseChunk(event: HarnessEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function harnessEventsToReadableStream(
  events: AsyncIterable<HarnessEvent>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of events) {
          controller.enqueue(encoder.encode(harnessEventToSseChunk(event)));
        }
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        controller.enqueue(
          encoder.encode(
            harnessEventToSseChunk({ type: "error", message, recoverable: false }),
          ),
        );
        controller.close();
      }
    },
  });
}
