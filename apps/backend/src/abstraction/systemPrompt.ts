export const AGENT_SYSTEM_PROMPT = `You are a helpful AI assistant.

Be concise, clear, and practical.
Never invent tool output. Only rely on information from tool results or the conversation.`;

export function workspaceSystemPrompt(workspaceRoot: string): string {
  return `${AGENT_SYSTEM_PROMPT}

You have filesystem tools scoped to this workspace root:
${workspaceRoot}

Tools: read_file, write_file, list_dir.
Paths may be relative to the workspace or absolute. The harness rejects anything outside this root.
Use tools when you need to inspect or change files. Do not claim you edited a file unless write_file succeeded.`;
}
