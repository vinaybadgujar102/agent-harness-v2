---
name: explore-workspace
description: Explore, map, or summarize what is in the workspace. Use when the user asks what the repo contains, where something lives, or to look around before answering.
---

# Explore workspace

## Done when

You can name the relevant files from tool output, not from guesses.

## Steps

1. `list_dir` at `.` (workspace root).
2. `list_dir` into the 1–3 folders most likely to hold the answer.
3. `read_file` the files that actually matter. Prefer README, package.json, and the named module over dumping every file.
4. Answer with paths you read. If a path failed the jail or was missing, say so.

Stay on `list_dir` and `read_file`. Do not `write_file` unless the user also asked for a change; then switch to the edit-files skill.
