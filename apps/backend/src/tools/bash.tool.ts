import type { Tool } from "./toolClass";

async function runBash(command: string) {
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

export const bashTool: Tool = {
  name: "bash_tool",
  description: "Execute a bash command.",
  inputSchema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "Bash command to execute",
      },
    },
    required: ["command"],
  },
  async execute(args) {
    const { command } = args as { command: string };
    return runBash(command);
  },
};
