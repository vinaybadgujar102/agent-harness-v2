export const SLASH_COMMANDS = [
  { name: "/quit", description: "Exit the TUI", action: "quit" },
  { name: "/new", description: "Start a new chat", action: "new-chat" },
  { name: "/clear", description: "Start a new chat (alias)", action: "new-chat" },
  { name: "/plan", description: "Plan mode (no file edits)", action: "plan-mode" },
  { name: "/agent", description: "Agent mode (edit files)", action: "agent-mode" },
  {
    name: "/implement",
    description: "Agent mode: run saved plan",
    action: "implement-plan",
  },
] as const;

export type SlashCommand = (typeof SLASH_COMMANDS)[number];

export function slashCommandForInput(text: string): SlashCommand | undefined {
  return SLASH_COMMANDS.find((c) => c.name === text);
}

export function slashMenuActive(draft: string): boolean {
  return draft.startsWith("/") && !draft.includes(" ");
}

export function filterSlashCommands(draft: string): SlashCommand[] {
  if (!slashMenuActive(draft)) return [];
  const q = draft.toLowerCase();
  return SLASH_COMMANDS.filter((c) => c.name.toLowerCase().startsWith(q));
}
