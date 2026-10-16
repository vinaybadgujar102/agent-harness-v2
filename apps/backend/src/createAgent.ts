import type { GoogleGenAI } from "@google/genai";
import { GoogleGenAI as GoogleGenAIClient } from "@google/genai";
import { LovableAiAgent } from "./abstraction/agent";
import { GoogleAgentProvider } from "./abstraction/providers/google";
import {
  AGENT_SYSTEM_PROMPT,
  implementModeSystemPrompt,
  planModeSystemPrompt,
  workspaceSystemPrompt,
} from "./abstraction/systemPrompt";
import { ensureDefaultSkills, loadSkills } from "./skills/skillStore";
import { createFsTools } from "./tools/fsTools";
import {
  createRunSubagentTool,
  type HarnessMode,
} from "./tools/subagentTool";
import type { Tool } from "./tools/toolClass";

export type { HarnessMode };

export type CreateAgentOptions = {
  apiKey?: string;
  workspaceRoot?: string;
};

const harnessClients = new WeakMap<LovableAiAgent, GoogleGenAI>();

export function geminiClientForAgent(
  agent: LovableAiAgent,
): GoogleGenAI | undefined {
  return harnessClients.get(agent);
}

function skillsFor(workspaceRoot: string) {
  ensureDefaultSkills(workspaceRoot);
  return loadSkills(workspaceRoot);
}

export function workspaceTools(
  workspaceRoot: string,
  mode: HarnessMode,
  client: GoogleGenAI,
): Tool[] {
  const fs =
    mode === "plan"
      ? createFsTools(workspaceRoot, { writable: false })
      : createFsTools(workspaceRoot);
  return [...fs, createRunSubagentTool({ client, workspaceRoot, mode })];
}

export function modeConfig(
  workspaceRoot: string,
  mode: HarnessMode,
  client: GoogleGenAI,
) {
  const skills = skillsFor(workspaceRoot);
  const tools = workspaceTools(workspaceRoot, mode, client);
  const systemPrompt =
    mode === "plan"
      ? planModeSystemPrompt(workspaceRoot, skills)
      : mode === "implement"
        ? implementModeSystemPrompt(workspaceRoot, skills)
        : workspaceSystemPrompt(workspaceRoot, skills);
  return { systemPrompt, tools };
}

export function createAgent(options: CreateAgentOptions = {}) {
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  const client = new GoogleGenAIClient({ apiKey });
  const tools = options.workspaceRoot
    ? workspaceTools(options.workspaceRoot, "agent", client)
    : [];
  const skills = options.workspaceRoot
    ? skillsFor(options.workspaceRoot)
    : [];
  const systemPrompt = options.workspaceRoot
    ? workspaceSystemPrompt(options.workspaceRoot, skills)
    : AGENT_SYSTEM_PROMPT;

  const agent = new LovableAiAgent(
    new GoogleAgentProvider(client, { systemPrompt, tools }),
    { tools },
  );
  harnessClients.set(agent, client);
  return agent;
}
