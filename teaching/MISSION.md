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

## Parallel track: Orchestrator + sub-agents (2026-10-16)

User asked to **add** orchestrator / sub-agent pattern to the product, not only skills.

### Why

One `LovableAiAgent` loop works for bounded tasks. Heavy work (parallel explore, independent file slices, research vs implement) needs a **lead** that delegates and **workers** with isolated context. Prompt text already mentions subagents; the harness has no delegation tool yet.

### Success looks like

- Can name **agents-as-tools** vs **handoff** and pick agents-as-tools for tuffy (lead keeps user reply).
- Can map lead → `LovableAiAgent`, worker → nested run via a `delegate_*` tool, parent sees summary only.
- Can list guardrails: no delegate tool on workers, depth cap, bounded brief (goal, inputs, done, tools).
- Can sketch where the tool plugs into `executeTool` without forking the event stream model.

### Out of scope (this track)

- Multi-tenant agent fleets, arbitrary model roster UI, or Cursor-parity Task tool on day one.
- Handoff-style “specialist owns the chat” unless product explicitly wants mode switch.

## Out of scope (skills track)

- Cloning skills.sh / OpenClaw or crawling 40k listings.
- Claude API container Skills (`container` + code-execution tool) as the first design.
- Streaming lesson track (paused; material stays in `teaching/lessons/0001–0005`).
- Production marketplace, skill signing, or multi-tenant skill stores.
