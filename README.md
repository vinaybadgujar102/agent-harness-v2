# lovable-clone (agent-harness-v2)

Bun monorepo for a multi-provider tool-calling agent harness.

## Apps

- **backend** — `LovableAiAgent` loop with Google / OpenAI / Claude providers and a shared tool registry.

## Run

```sh
bun install
bun run --filter backend start
```

Set `GEMINI_API_KEY`, and optionally `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`, in the environment (Bun loads `.env` automatically).

## Packages

- `@repo/eslint-config`, `@repo/typescript-config` — shared lint/TS config for future apps.

## Notes

- Design notes for the Gemini Interactions API: `learnings/writing_agent_loop_gemini.md`.
