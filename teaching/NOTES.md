# Teaching notes

- User asked for streaming **prerequisites first**, explicitly **no code changes** until design is clear.
- Repo today: `LLMProvider.converse()` returns one `InteractionStep` per loop iteration; `LovableAiAgent.create()` blocks until final text.
- Default run path: CLI in `apps/backend/src/index.ts`, not HTTP yet.
- Confirm mission edits with user before rewriting `MISSION.md` goals.
- User wants **teach mode**: explain, reference, lessons, quizzes — not implementation nudges or refactors unless they ask to build.
- HarnessEvent also lives in `apps/backend/src/abstraction/types.ts` from one session; canonical **teaching** doc is `teaching/reference/harness-events.html`. Code can lag or differ until they explicitly implement.
- **Paused** streaming teach track (2026-10-15). Resume with `/teach`, lesson **4b**, or build mode. Entry point: `teaching/reference/streaming-cheatsheet.html`.
- **Paused teach** (2026-10-16): User understood gist; implementing skills in harness. Layout `.tuffy/skills/<name>/SKILL.md`. Scan frontmatter only; activation is existing `read_file`.
