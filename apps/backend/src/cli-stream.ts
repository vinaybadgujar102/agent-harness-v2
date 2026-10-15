import { createAgent } from "./createAgent";
import { printHarnessStreamToConsole } from "./consoleHarnessStream";

const prompt = process.argv.slice(2).join(" ").trim();
if (!prompt) {
  console.error("Usage: bun src/cli-stream.ts <prompt>");
  process.exit(1);
}

const agent = createAgent({ workspaceRoot: process.cwd() });
await printHarnessStreamToConsole(agent.createStream(prompt));
