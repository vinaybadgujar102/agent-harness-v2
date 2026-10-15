#!/usr/bin/env bun
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { render } from "ink";
import { createElement } from "react";
import { createAgent } from "../createAgent";
import { App } from "./App";
import {
  CREDENTIALS_PATH,
  resolveGeminiKey,
  writeStoredGeminiKey,
} from "./credentials";
import { parseArgs } from "./parseArgs";
import { readSecretLine } from "./readSecret";

async function ensureWorkspace(path: string) {
  try {
    const info = await stat(path);
    if (!info.isDirectory()) {
      console.error(`Not a directory: ${path}`);
      process.exit(1);
    }
  } catch {
    console.error(`Workspace does not exist: ${path}`);
    process.exit(1);
  }
}

async function runInit() {
  const key = (
    await readSecretLine(process.stdin, process.stdout, "GEMINI_API_KEY: ")
  ).trim();
  if (!key) {
    console.error("Empty key");
    process.exit(1);
  }
  await writeStoredGeminiKey(key);
  console.log(`Wrote ${CREDENTIALS_PATH}`);
}

async function main() {
  let args: ReturnType<typeof parseArgs>;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  if (args.cmd === "init") {
    await runInit();
    return;
  }

  const workspace = resolve(args.workspace ?? process.cwd());
  await ensureWorkspace(workspace);

  let apiKey = await resolveGeminiKey();
  if (!apiKey) {
    console.error("No GEMINI_API_KEY. Run init.");
    await runInit();
    apiKey = await resolveGeminiKey();
    if (!apiKey) process.exit(1);
  }

  const agent = createAgent({ apiKey, workspaceRoot: workspace });
  render(
    createElement(App, {
      agent,
      workspace,
      firstPrompt: args.firstPrompt,
    }),
  );
}

await main();
