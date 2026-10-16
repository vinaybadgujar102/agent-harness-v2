export function statusForTool(toolName: string, toolArgs: unknown): string {
  const path =
    typeof toolArgs === "object" &&
    toolArgs !== null &&
    "path" in toolArgs &&
    typeof (toolArgs as { path: unknown }).path === "string"
      ? (toolArgs as { path: string }).path
      : "";
  if (toolName === "read_file") return path ? `reading ${path}` : "reading";
  if (toolName === "write_file") return path ? `editing ${path}` : "editing";
  if (toolName === "list_dir") return path ? `listing ${path}` : "listing";
  if (toolName === "run_subagent") {
    const role =
      typeof toolArgs === "object" &&
      toolArgs !== null &&
      "role" in toolArgs &&
      typeof (toolArgs as { role: unknown }).role === "string"
        ? (toolArgs as { role: string }).role
        : "";
    return role ? `subagent ${role}` : "subagent";
  }
  return toolName;
}
