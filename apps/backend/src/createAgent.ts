import { GoogleGenAI } from "@google/genai";
import { LovableAiAgent } from "./abstraction/agent";
import { GoogleAgentProvider } from "./abstraction/providers/google";
import {
  AGENT_SYSTEM_PROMPT,
  implementModeSystemPrompt,
  planModeSystemPrompt,
  workspaceSystemPrompt,
} from "./abstraction/systemPrompt";
import { createFsTools } from "./tools/fsTools";

export type HarnessMode = "agent" | "plan" | "implement";

export type CreateAgentOptions = {
  apiKey?: string;
  workspaceRoot?: string;
};

export function modeConfig(workspaceRoot: string, mode: HarnessMode) {
  const tools =
    mode === "plan"
      ? createFsTools(workspaceRoot, { writable: false })
      : createFsTools(workspaceRoot);
  const systemPrompt =
    mode === "plan"
      ? planModeSystemPrompt(workspaceRoot)
      : mode === "implement"
        ? implementModeSystemPrompt(workspaceRoot)
        : workspaceSystemPrompt(workspaceRoot);
  return { systemPrompt, tools };
}

export function createAgent(options: CreateAgentOptions = {}) {
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  const client = new GoogleGenAI({ apiKey });
  const tools = options.workspaceRoot
    ? createFsTools(options.workspaceRoot)
    : [];
  const systemPrompt = options.workspaceRoot
    ? workspaceSystemPrompt(options.workspaceRoot)
    : AGENT_SYSTEM_PROMPT;

  return new LovableAiAgent(
    new GoogleAgentProvider(client, { systemPrompt, tools }),
    { tools },
  );
}
