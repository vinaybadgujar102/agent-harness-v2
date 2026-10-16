# Orchestrator + sub-agent teaching track opened

**Date:** 2026-10-16

User `/teach` on adding orchestrator and sub-agent pattern to agent-harness-v2.

**Baseline in repo:**

- `LovableAiAgent` is a single-thread tool loop (`agent.ts`).
- Tools today: jailed `read_file`, `write_file`, `list_dir` via `createFsTools`.
- `AGENT_SYSTEM_PROMPT` already tells the model to use subagents when exposed — but no such tool exists (`systemPrompt.ts`).

**Chosen pattern:** Agents-as-tools (lead merges; not handoff ownership).

**Next build slice (when user leaves teach mode):** one `run_subagent` tool, worker prompt template, recursion guard, optional read-only worker profile.

**Lesson:** `teaching/lessons/0010-orchestrator-subagent.html`
