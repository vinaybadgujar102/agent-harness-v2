import type { HarnessEvent } from "./abstraction/types";

/** Print harness stream: thinking block first, then answer text (labels on stderr). */
export async function printHarnessStreamToConsole(
  events: AsyncIterable<HarnessEvent>,
): Promise<void> {
  let turn = 0;
  let wroteThinkingHeader = false;
  let wroteAnswerHeader = false;

  const resetSectionHeaders = () => {
    wroteThinkingHeader = false;
    wroteAnswerHeader = false;
  };

  for await (const event of events) {
    switch (event.type) {
      case "turn_started":
        if (turn > 0) process.stderr.write("\n");
        turn += 1;
        resetSectionHeaders();
        process.stderr.write(`\n[turn ${turn}]\n`);
        break;

      case "thought_delta":
        if (!wroteThinkingHeader) {
          process.stderr.write("\n--- thinking ---\n");
          wroteThinkingHeader = true;
        }
        process.stdout.write(event.text);
        break;

      case "text_delta":
        if (!wroteAnswerHeader) {
          if (wroteThinkingHeader) {
            process.stdout.write("\n\n--- answer ---\n\n");
          } else {
            process.stderr.write("\n--- answer ---\n");
          }
          wroteAnswerHeader = true;
        }
        process.stdout.write(event.text);
        break;

      case "tool_call_ready":
        process.stderr.write(
          `\n[tool ready] ${event.toolName} ${JSON.stringify(event.toolArgs)}\n`,
        );
        break;

      case "tool_run_started":
        process.stderr.write(`\n[tool run] ${event.toolName} …\n`);
        break;

      case "tool_run_finished":
        process.stderr.write(`[tool done] ${event.toolName}\n`);
        break;

      case "turn_completed":
        process.stderr.write(`[turn completed] ${event.status}\n`);
        break;

      case "error":
        process.stderr.write(`\n[error] ${event.message}\n`);
        break;

      case "message_complete":
        break;
    }
  }

  process.stdout.write("\n");
}
