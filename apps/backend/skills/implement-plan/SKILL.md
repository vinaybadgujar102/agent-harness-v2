---
name: implement-plan
description: Implement tasks from .tuffy/plans/active.md and track checkboxes. Use when the user asks to implement, execute, or work the active plan.
---

# Implement the active plan

## Done when

Every in-scope checkbox is `- [x]` and the matching file changes have succeeding `write_file` results.

## Steps

1. `read_file` `.tuffy/plans/active.md`. Stop if it is missing; tell the user to run plan mode first.
2. Pick the next incomplete item (`- [ ]`). Mark it `- [~]` with `write_file` on that plan file.
3. Make the code change with `read_file` / `write_file` / `list_dir` only. Follow edit-files habits: read before write.
4. Confirm the change from tool output. Then mark that item `- [x]` in `.tuffy/plans/active.md` via `write_file`.
5. Repeat until the asked scope is done. Leave unrelated `- [ ]` items pending.

Plan markers: pending `- [ ]`, in progress `- [~]`, done `- [x]`.
