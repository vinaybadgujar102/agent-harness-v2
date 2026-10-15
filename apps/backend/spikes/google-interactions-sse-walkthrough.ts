/**
 * Isolated walkthrough: Google Interactions SSE via @google/genai.
 * Run: bun apps/backend/spikes/google-interactions-sse-walkthrough.ts
 * Run: bun apps/backend/spikes/google-interactions-sse-walkthrough.ts --tools
 */
import { GoogleGenAI } from "@google/genai";
import { bashTool } from "../src/tools/bash.tool";

const useTools = process.argv.includes("--tools");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function logEvent(event: { event_type?: string; [k: string]: unknown }) {
  const t = event.event_type ?? "unknown";
  switch (t) {
    case "interaction.created":
      console.log("\n[interaction.created]", {
        id: (event as { interaction?: { id?: string } }).interaction?.id,
        status: (event as { interaction?: { status?: string } }).interaction
          ?.status,
      });
      break;
    case "interaction.status_update":
      console.log("[interaction.status_update]", event.status);
      break;
    case "step.start": {
      const e = event as { index?: number; step?: { type?: string } };
      console.log(`\n[step.start] index=${e.index} type=${e.step?.type}`);
      break;
    }
    case "step.delta": {
      const e = event as {
        index?: number;
        delta?: { type?: string; text?: string; arguments?: string };
      };
      const d = e.delta;
      if (!d) break;
      if (d.type === "text" && d.text) process.stdout.write(d.text);
      else if (d.type === "arguments_delta" && d.arguments)
        process.stdout.write(`\n  args_fragment: ${JSON.stringify(d.arguments)}`);
      else console.log(`\n[step.delta] index=${e.index} delta.type=${d.type}`);
      break;
    }
    case "step.stop":
      console.log(`\n[step.stop] index=${(event as { index?: number }).index}`);
      break;
    case "interaction.completed":
      console.log("\n[interaction.completed]", {
        status: (event as { interaction?: { status?: string } }).interaction
          ?.status,
        usage: (event as { interaction?: { usage?: unknown } }).interaction
          ?.usage,
      });
      break;
    default:
      console.log(`\n[${t}]`, JSON.stringify(event).slice(0, 200));
  }
}

const stream = await ai.interactions.create({
  model: "gemini-2.5-flash",
  stream: true,
  input: useTools
    ? "Run bash_tool with command: echo hello-from-stream"
    : "In one short sentence, what is SSE?",
  ...(useTools
    ? {
        tools: [
          {
            type: "function" as const,
            name: bashTool.name,
            description: bashTool.description,
            parameters: bashTool.inputSchema,
          },
        ],
      }
    : {}),
});

console.log("--- SSE walkthrough (stream: true) ---");
console.log(`mode: ${useTools ? "tools" : "text-only"}\n`);

for await (const event of stream) {
  logEvent(event as { event_type?: string });
}

console.log("\n--- done ---");
