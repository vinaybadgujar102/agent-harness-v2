# Agent Skills — resources

## Knowledge

- [Agent Skills specification](https://agentskills.io/specification)
  Canonical directory + `SKILL.md` frontmatter rules (`name`, `description`, optional fields). Use for: parser, validation, folder layout.
- [Agent Skills overview (agentskills.io)](https://agentskills.io/home)
  Progressive disclosure in three stages (discovery / activation / execution). Use for: load-order design.
- [Anthropic: Agent Skills overview](https://docs.anthropic.com/en/docs/agents-and-tools/agent-skills/overview)
  Same three levels with token budgets (~100 / &lt;5k / on demand) and security notes. Use for: how a production agent actually reads skills (filesystem + bash, not a special tool type).
- [Ling, Zhong, Huang: Agent Skills: A Data-Driven Analysis…](https://arxiv.org/pdf/2602.08004)
  40,285 skills.sh listings (snapshot 2026-02-05). Median 1,414 tokens; ~46% name-level duplicates; ~39% L1–L3 risk. Appendix A restates structure + index-then-load. Use for: why not dump every skill into context; why audit marketplace skills. **Not** a harness spec.
- [Anthropic skills repo / historical spec pointer](https://github.com/anthropics/skills/blob/main/spec/agent-skills-spec.md)
  Points at the open spec. Use for: origin of the format.
- In-repo: `apps/backend/src/tools/fsTools.ts`, `apps/backend/src/abstraction/systemPrompt.ts`
  Current tool surface and static system prompt. Use for: mapping Level 2/3 onto `read_file` without new vendor APIs.

## Wisdom (Communities)

- [agentskills/agentskills GitHub](https://github.com/agentskills/agentskills)
  Spec issues and examples. Use for: format questions, not product gossip.
- [Anthropic Skills cookbook](https://github.com/anthropics/skills)
  Authoring examples. Use for: what a good `SKILL.md` body looks like.

## Gaps

- No first-party Google Interactions doc for “Agent Skills”; this harness must implement the open format itself.
- Paper adoption numbers are marketplace installs, not verified in-agent executions (Limitation section).

## Streaming (paused track)

- See git history of this file or `teaching/lessons/0001–0005` plus `teaching/reference/streaming-cheatsheet.html`.
