# Mission: Agent skills in tuffy / agent-harness-v2

## Why

Ship a harness that loads reusable Agent Skills (`SKILL.md` modules) the same way Cursor/Claude Code do: metadata always, body on demand. Recurring workflows stop living as one-off system-prompt paste. The agent stays a general loop; domain procedure lives in versioned files.

## Success looks like

- Can explain skill vs tool vs system prompt, and why stuffing every `SKILL.md` into the prompt is the wrong design.
- Can sketch the three-level load (YAML metadata → `SKILL.md` body → bundled files/scripts) and map it onto this repo’s existing `read_file` / `list_dir` tools.
- Can parse required frontmatter (`name`, `description`) against the open spec, and reject a skill that fails it.
- Treats untrusted marketplace skills as software: audit before they can drive writes or shell.

## Constraints

- Bun; current loop is `LovableAiAgent` + Google provider + jailed filesystem tools.
- Teach and design before large refactors (same preference as the streaming track).
- Primary source of format truth: Agent Skills spec + Anthropic docs. The arXiv paper is ecosystem context, not an implementation spec.

## Out of scope

- Cloning skills.sh / OpenClaw or crawling 40k listings.
- Claude API container Skills (`container` + code-execution tool) as the first design.
- Streaming lesson track (paused; material stays in `teaching/lessons/0001–0005`).
- Production marketplace, skill signing, or multi-tenant skill stores.
