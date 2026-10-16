# lovable-clone (agent-harness-v2)

Bun monorepo for a multi-provider tool-calling agent harness.

## Apps

- **backend** — `LovableAiAgent` loop, Google TUI (`tuffy-agent`), jailed `read_file` / `write_file` / `list_dir`, and SSE (`POST /api/agent/stream`).

## Run

```sh
bun install
cd apps/backend
bun run tuffy init
bun run tuffy -- --workspace /path/to/folder
```

Workspace defaults to cwd. Creds: `~/.config/tuffy-agent/credentials`. Or set `GEMINI_API_KEY`.

SSE server (no filesystem tools):

```sh
bun run --filter backend start
```

## Packages

- `@repo/eslint-config`, `@repo/typescript-config` — shared lint/TS config for future apps.

## Learning (streaming / Interactions)

Lessons, references, and notes live in [`teaching/`](./teaching/). Start at [`teaching/reference/streaming-cheatsheet.html`](./teaching/reference/streaming-cheatsheet.html).
