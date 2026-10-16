import { GoogleGenAI } from "@google/genai";
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

export type HarnessMode = "agent" | "plan" | "implement";

export type CreateAgentOptions = {
  apiKey?: string;
  workspaceRoot?: string;
};

function skillsFor(workspaceRoot: string) {
  ensureDefaultSkills(workspaceRoot);
  return loadSkills(workspaceRoot);
}

export function modeConfig(workspaceRoot: string, mode: HarnessMode) {
  const skills = skillsFor(workspaceRoot);
  const tools =
    mode === "plan"
      ? createFsTools(workspaceRoot, { writable: false })
      : createFsTools(workspaceRoot);
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
  const client = new GoogleGenAI({ apiKey });
  const tools = options.workspaceRoot
    ? createFsTools(options.workspaceRoot)
    : [];
  const skills = options.workspaceRoot
    ? skillsFor(options.workspaceRoot)
    : [];
  const systemPrompt = options.workspaceRoot
    ? workspaceSystemPrompt(options.workspaceRoot, skills)
    : AGENT_SYSTEM_PROMPT;

  return new LovableAiAgent(
    new GoogleAgentProvider(client, { systemPrompt, tools }),
    { tools },
  );
}
