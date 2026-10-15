export type CliArgs =
  | { cmd: "init" }
  | { cmd: "tui"; workspace?: string; firstPrompt: string };

export function parseArgs(argv: string[]): CliArgs {
  if (argv[0] === "init") return { cmd: "init" };

  let workspace: string | undefined;
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--workspace") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("Usage: tuffy-agent --workspace <dir>");
      }
      workspace = value;
      i += 1;
      continue;
    }
    if (token) rest.push(token);
  }
  return { cmd: "tui", workspace, firstPrompt: rest.join(" ").trim() };
}
