# lovable-clone (agent-harness-v2)

A small coding-agent harness for the terminal and HTTP. It gives Gemini controlled
access to a jailed workspace through a few tools, then runs a read-act loop until
the model answers, hits a stuck limit, or the user aborts.

The loop is meant to stay readable: vendor streams map into one `HarnessEvent`
vocabulary, tools are Zod objects, and UIs (Ink TUI, console, SSE) only render
that stream. Inspired by the shape of [cogent](https://github.com/mr-raj12/cogent)
(one loop, one event vocabulary, adapters at the edge) — this repo is a Bun
monorepo with Google Interactions as the live path, Agent Skills, and in-process
sub-agents.

```bash
cd apps/backend
bun run tuffy init
bun run tuffy -- --workspace /path/to/folder
bun run tuffy -- "list the TypeScript files under src"
```

---

## Contents

- [Overview](#overview)
- [Features](#features)
- [System design](#system-design)
- [Project layout](#project-layout)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Usage](#usage)
- [Modes](#modes)
- [Tools](#tools)
- [Skills](#skills)
- [Sub-agents](#sub-agents)
- [Configuration](#configuration)
- [Development](#development)
- [Design notes](#design-notes)
- [Learning](#learning)

## Overview

Most agent SDKs hide the loop. This harness does the opposite: one class
(`LovableAiAgent`) owns conversation state, tool execution, and recovery. Providers
translate SDK payloads into `InteractionStep` (batch) or `HarnessEvent` (stream).
The TUI, console printer, and SSE server never talk to Gemini directly.

It is a learning repo as much as a product: `teaching/` holds lessons on the
streaming contract, skills, and orchestrator pattern. The code in
`apps/backend` is the live implementation of those contracts.

## Features

- **Streaming end to end.** `createStream` yields `HarnessEvent`s from the Google
  Interactions SSE through the loop to Ink, stdout, or HTTP.
- **Batch loop too.** `create()` blocks until final text; same stuck / retry
  policy as the stream.
- **Jailed filesystem.** `read_file`, `write_file`, `list_dir` resolve through
  `realpath` and reject paths outside the workspace root.
- **Agent Skills.** Frontmatter-only index in the system prompt; the model
  activates a skill by `read_file` on `.tuffy/skills/<name>/SKILL.md`.
- **Orchestrator / sub-agent.** Workspace modes register `run_subagent`. The
  lead spawns a nested `LovableAiAgent` with a worker prompt and a restricted
  tool set. Workers cannot delegate again.
- **Plan / implement / agent.** Slash commands swap prompt + tools. Plan mode
  is read-only and writes `.tuffy/plans/active.md`. Implement mode runs that
  file and expects checkbox updates.
- **Stuck recovery.** Repeated identical tool calls and empty / incomplete
  provider turns count against per-turn and run-wide caps.
- **Abort.** TUI Esc cancels the provider iterable and rolls conversation
  state back to the mark taken at stream start.
- **Three surfaces.** Ink TUI (`tuffy-agent`), console stream CLI, SSE
  (`POST /api/agent/stream`). SSE currently has no workspace tools.

## System design

```
                  ┌────────────────────────────────────────────┐
   CLI / HTTP ──▶ │              entry (cli / server)           │
                  │   parse args · resolve key · createAgent    │
                  └─────────────────────┬──────────────────────┘
                                        │
                                        ▼
                  ┌──────────────────────────────────────────────┐
                  │              LovableAiAgent                   │
                  │  loop: converseStream → collect tool_call     │
                  │  → execute → append result → repeat           │
                  └───────┬───────────────────────────┬──────────┘
                          │ HarnessEvent               │ tool execute
                          ▼                            ▼
              ┌───────────────────────┐    ┌──────────────────────┐
              │   GoogleAgentProvider │    │   Tool map           │
              │   (Interactions API)  │    │ read_file write_file │
              │   adapters → SDK      │    │ list_dir run_subagent│
              └───────────────────────┘    └──────────────────────┘
                          │                            │
                          ▼                            ▼
                   Gemini API                   jailed workspace
                                               nested worker loop
```

Two contracts hold the system together:

- **`InteractionStep`** — batch `converse()` outcome: `tool_call_needed` or
  `message`. Used by `create()`.
- **`HarnessEvent`** — what streams yield to UIs: `turn_started`,
  `thought_delta`, `text_delta`, `tool_call_ready`, `message_complete`,
  `turn_completed`, `tool_run_started` / `tool_run_finished`, `error`.
  Vendor SSE is mapped here before the loop or any UI sees it.

A new provider implements `LLMProvider` + `StreamingLLMProvider`. A new UI
only consumes `HarnessEvent`. Claude and OpenAI adapters exist for batch
`converse`; the TUI and SSE wire Google today (`gemini-2.5-flash`).

### The agent loop

`LovableAiAgent` (`apps/backend/src/abstraction/agent.ts`) is the core.

**Stream (`createStream`):**

1. Mark conversation length, append the user prompt.
2. Open `converseStream`. Forward every `HarnessEvent`. Record assistant text
   on `message_complete`. Remember `tool_call_ready` and `turn_completed`.
3. `failed` / `cancelled` stop the run.
4. `completed` with no error stops the run (final answer).
5. `requires_action` plus a pending tool: execute, emit `tool_run_*`, append
   the result, loop.
6. Anything else (no `turn_completed`, incomplete, error) bumps stuck counters
   and retries the same conversation state, or hard-stops.

**Batch (`create`):** same tool/record/continue cycle via `converse()`, throws
when stuck limits fire.

Abort: if the signal fires, restore the conversation to the mark and yield
`{ type: "error", message: "cancelled", recoverable: true }`.

### Provider normalization

Internal history is `ConversationTurn`: user, assistant, tool_call, tool_result.

Google maps that to Interactions `input` steps (`toGoogleSteps`), tools to
`function` declarations, and the system prompt to `system_instruction`.
Streaming chunks become `HarnessEvent` in `adapters/googleStream.ts`.

Tools are `defineTool`: Zod input, JSON Schema for the model, `safeParse` at
execute time. Invalid args return `{ error }` instead of throwing.

## Project layout

```
apps/backend/
├── src/
│   ├── createAgent.ts          # Google client, skills, tools, prompts
│   ├── index.ts                # SSE server entry
│   ├── server.ts / http/sse.ts
│   ├── cli-stream.ts           # one-shot console stream
│   ├── abstraction/
│   │   ├── agent.ts            # the loop
│   │   ├── conversation.ts
│   │   ├── types.ts            # HarnessEvent, InteractionStep, providers
│   │   ├── systemPrompt.ts
│   │   ├── providers/          # google (live stream), claude, openai
│   │   └── adapters/           # SDK ↔ conversation / stream mapping
│   ├── tools/
│   │   ├── toolClass.ts        # Tool + defineTool
│   │   ├── fsTools.ts
│   │   ├── workspacePath.ts    # jail
│   │   └── subagentTool.ts
│   ├── skills/skillStore.ts
│   ├── plan/planStore.ts
│   └── tui/                    # Ink App, slash commands, credentials
├── skills/                     # bundled SKILL.md defaults
teaching/                       # lessons, references, learning records
packages/                       # shared eslint / tsconfig
```

## Tech stack

| Area | Choice |
|------|--------|
| Language | TypeScript |
| Runtime | Bun 1.3 (workspaces + Turbo) |
| Live model | `@google/genai` Interactions, `gemini-2.5-flash` |
| Other SDKs | `@anthropic-ai/sdk`, `openai` (batch adapters) |
| Terminal UI | `ink`, `react` |
| Schemas | `zod` (`z.toJSONSchema` for tool APIs) |
| HTTP | `Bun.serve` SSE |

## Getting started

Requires **Bun** and a Gemini API key.

```bash
git clone <this-repo>
cd agent-harness-v2
bun install
cd apps/backend
bun run tuffy init    # writes ~/.config/tuffy-agent/credentials
```

Or set `GEMINI_API_KEY` (Bun loads `.env`). Env wins over the credentials file.

## Usage

```
tuffy-agent init                         Store GEMINI_API_KEY
tuffy-agent                              TUI, workspace = cwd
tuffy-agent --workspace <dir>            Jail tools to that folder
tuffy-agent --workspace <dir> "prompt"   TUI with first user message
```

From `apps/backend`:

```bash
bun run tuffy -- --workspace /path/to/folder
bun run stream -- "Create a simple HTML todo app"
bun run start
```

Optional: `bun link` in `apps/backend`, then `tuffy-agent` from any folder.

SSE (no filesystem tools):

```bash
curl -N -X POST http://localhost:3000/api/agent/stream \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"In one sentence, what is SSE?"}'
```

Each `data:` line is one JSON `HarnessEvent`.

TUI: Esc aborts the current run. Slash commands:

| Command | Effect |
|---------|--------|
| `/plan` | Read-only tools; save final reply to `.tuffy/plans/active.md` |
| `/implement` | Load that plan, writable tools, implement-mode prompt |
| `/agent` | Default writable workspace agent |
| `/new`, `/clear` | New conversation |
| `/quit` | Exit |

## Modes

`createAgent` / `modeConfig` take `HarnessMode`: `agent` | `plan` | `implement`.

| Mode | Tools | Prompt |
|------|--------|--------|
| `agent` | FS + `run_subagent` | Workspace instructions |
| `plan` | Read-only FS + `run_subagent` (`read_only` workers only) | Plan markdown + checkboxes |
| `implement` | Same as agent | Workspace + update `.tuffy/plans/active.md` |

`setMode` swaps tools on the agent and `system_instruction` on the Google
provider without rebuilding the client.

## Tools

| Tool | What it does |
|------|----------------|
| `read_file` | UTF-8 file inside the jail, max 256KiB |
| `write_file` | Create/overwrite; makes parent dirs; omitted in plan mode |
| `list_dir` | Directory listing (default `.`) |
| `run_subagent` | Nested worker loop; see [Sub-agents](#sub-agents) |

A tool is `{ name, description, inputSchema, execute }`. Register it in
`workspaceTools` (or pass `tools` into `LovableAiAgent`) and the model sees it
on the next turn.

Unknown tool names return `{ error: "tool not found" }`. Paths outside the
workspace return `{ error: "path is outside the workspace" }`.

## Skills

Not tools. On first workspace run, bundled defaults copy into
`.tuffy/skills/` if missing (`explore-workspace`, `edit-files`,
`implement-plan`). Existing files are not overwritten.

`loadSkills` scans `SKILL.md` frontmatter only (`name`, `description`). Folder
name must match `name`. The harness injects an index into the system prompt.
The model loads a body with `read_file` on that path.

Add your own: `.tuffy/skills/<name>/SKILL.md`.

## Sub-agents

`run_subagent` args: `role`, `brief`, optional `tool_profile`
(`read_only` | `read_write`). Plan mode forces `read_only`. Default profile is
`read_only`.

The worker is a new `LovableAiAgent` + `GoogleAgentProvider` in-process: worker
system prompt, FS tools for the profile, no `run_subagent`. It returns a
summary string for the lead to merge — not the worker transcript.

## Configuration

| Source | Role |
|--------|------|
| `GEMINI_API_KEY` | Highest priority key |
| `~/.config/tuffy-agent/credentials` | `{ "geminiApiKey": "..." }`, mode 0600 |
| `--workspace` | Jail root (default cwd) |
| `.tuffy/skills/` | Per-workspace skills |
| `.tuffy/plans/active.md` | Plan mode output / implement input |

SSE uses `PORT` (default 3000) and `createAgent()` with no workspace.

## Development

```bash
bun install
cd apps/backend
bun test                 # bun:test, no extra runner
bun run check-types      # tsc --noEmit
bun run tuffy -- --workspace .
```

Repo root: `bun run check-types` / `bun run lint` via Turbo.

Loop recovery details: [`apps/backend/src/abstraction/agent.md`](./apps/backend/src/abstraction/agent.md).

## Design notes

- **Why one `HarnessEvent` stream.** Provider quirks stay in adapters. The
  loop, TUI, console, and SSE share one enum. cogent splits provider
  `StreamEvent` from UI `AgentEvent`; here tool execution is part of the same
  stream (`tool_run_started` / `tool_run_finished`) so HTTP clients see the
  same timeline as the TUI.
- **Why `Conversation` turns instead of raw SDK messages.** Tool calls and
  results need ids the next provider turn can round-trip. Adapters own
  translation (`toGoogleSteps`, `toChatMessages`).
- **Why jail in the tool, not the model.** The model may invent paths. Every
  FS tool goes through `resolveWorkspacePath` (`realpath` + prefix check),
  including not-yet-created write targets.
- **Why skills are files, not tools.** Index is cheap (name + description +
  path). Bodies load only when the model chooses. Activation is the existing
  `read_file` tool — no second dispatch path.
- **Why sub-agents are a tool.** Agents-as-tools: the lead stays one loop.
  Isolation is a new conversation + worker prompt + no nested `run_subagent`.
  Parallelism is multiple tool calls from the lead; workers themselves are
  serial loops.
- **Why stuck caps, not only `maxTurns`.** Empty or looping tool calls waste
  budget without a clean “turn count”. Per-turn retries reset on a *new* step
  (different name or args); `maxStuck` never resets.
- **Why SSE has no FS tools.** `createAgent()` without `workspaceRoot` keeps
  the HTTP demo off the operator’s disk. Wire a workspace explicitly if you
  want tools on that path.
- **Adding a provider** means implementing `converse` / `converseStream` that
  speak `InteractionStep` / `HarnessEvent`. The loop does not change.

## Learning

Lessons, references, and notes: [`teaching/`](./teaching/). Streaming recap:
[`teaching/reference/streaming-cheatsheet.html`](./teaching/reference/streaming-cheatsheet.html).
Skills: [`teaching/reference/skills-cheatsheet.html`](./teaching/reference/skills-cheatsheet.html).
Orchestrator: [`teaching/lessons/0010-orchestrator-subagent.html`](./teaching/lessons/0010-orchestrator-subagent.html).
