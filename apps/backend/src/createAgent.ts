import { GoogleGenAI } from "@google/genai";
import { LovableAiAgent } from "./abstraction/agent";
import { GoogleAgentProvider } from "./abstraction/providers/google";
import {
  AGENT_SYSTEM_PROMPT,
  workspaceSystemPrompt,
} from "./abstraction/systemPrompt";
import { createFsTools } from "./tools/fsTools";

export type CreateAgentOptions = {
  apiKey?: string;
  workspaceRoot?: string;
};

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
