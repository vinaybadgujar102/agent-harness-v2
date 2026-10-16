import type { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { LovableAiAgent } from "../abstraction/agent";
import { GoogleAgentProvider } from "../abstraction/providers/google";
import { subagentWorkerSystemPrompt } from "../abstraction/systemPrompt";
export type HarnessMode = "agent" | "plan" | "implement";
import { createFsTools } from "./fsTools";
import { defineTool, type Tool } from "./toolClass";

export type SubagentToolProfile = "read_only" | "read_write";

export type SubagentRunInput = {
  role: string;
  brief: string;
  tool_profile: SubagentToolProfile;
};

const runSubagentInput = z.object({
  role: z
    .string()
    .min(1)
    .describe("Short worker role label, e.g. explore-auth or edit-call-sites"),
  brief: z
    .string()
    .min(1)
    .describe(
      "Self-contained task: goal, inputs/paths, boundaries, done condition, summary format",
    ),
  tool_profile: z
    .enum(["read_only", "read_write"])
    .optional()
    .describe(
      "read_only: list_dir + read_file. read_write: also write_file. Unavailable in plan mode.",
    ),
});

export function workerToolsForProfile(
  workspaceRoot: string,
  profile: SubagentToolProfile,
): Tool[] {
  return profile === "read_write"
    ? createFsTools(workspaceRoot)
    : createFsTools(workspaceRoot, { writable: false });
}

export function effectiveSubagentProfile(
  mode: HarnessMode,
  requested: SubagentToolProfile | undefined,
): SubagentToolProfile {
  if (mode === "plan") return "read_only";
  return requested ?? "read_only";
}

export function createRunSubagentTool(deps: {
  client: GoogleGenAI;
  workspaceRoot: string;
  mode: HarnessMode;
  /** Tests inject a fake worker loop without calling Gemini. */
  runWorker?: (input: SubagentRunInput) => Promise<string>;
}) {
  return defineTool({
    name: "run_subagent",
    description:
      "Run a focused sub-agent in an isolated loop with its own tools. Use for independent heavy slices (parallel OK). Args: role, brief, optional tool_profile. Returns a summary for you to merge — not the worker transcript. Workers cannot delegate further.",
    input: runSubagentInput,
    async execute({ role, brief, tool_profile }) {
      const profile = effectiveSubagentProfile(deps.mode, tool_profile);
      if (deps.mode === "plan" && tool_profile === "read_write") {
        return {
          error:
            "read_write subagents are disabled in plan mode; use read_only or tool_profile omit",
        };
      }

      const input: SubagentRunInput = { role, brief, tool_profile: profile };

      try {
        const summary = deps.runWorker
          ? await deps.runWorker(input)
          : await runSubagentWithGemini(deps.client, deps.workspaceRoot, input);
        return { status: "completed", role, tool_profile: profile, summary };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { status: "failed", role, tool_profile: profile, error: message };
      }
    },
  });
}

async function runSubagentWithGemini(
  client: GoogleGenAI,
  workspaceRoot: string,
  input: SubagentRunInput,
): Promise<string> {
  const tools = workerToolsForProfile(workspaceRoot, input.tool_profile);
  const systemPrompt = subagentWorkerSystemPrompt(
    workspaceRoot,
    input.role,
    input.brief,
  );
  const provider = new GoogleAgentProvider(client, { systemPrompt, tools });
  const worker = new LovableAiAgent(provider, { tools });
  const summary = await worker.create(input.brief);
  return summary ?? "";
}
