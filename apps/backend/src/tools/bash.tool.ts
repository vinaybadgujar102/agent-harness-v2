import { Tool } from "../agentLoop";
import type { FunctionT } from "./toolType";

export const bashToolFunctionDeclaration: FunctionT = {
  type: "function",
  name: "bash_tool",
  description: "Uses the bash command",
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "Bash command to execute",
      },
    },
    required: ["command"],
  },
};

const bashTools = new Tool(bashToolFunctionDeclaration, bashTool);

export async function bashTool(command: string) {
  try {
    const result = await Bun.$`bash -c ${command}`;
    return {
      success: true,
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
      exitCode: result.exitCode,
    };
  } catch (err: any) {
    return {
      success: false,
      stdout: err.stdout?.toString() ?? "",
      stderr: err.stderr?.toString() ?? err.message,
      exitCode: err.exitCode ?? 1,
    };
  }
}
