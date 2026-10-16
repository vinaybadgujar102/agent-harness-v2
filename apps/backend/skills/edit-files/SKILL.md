---
name: edit-files
description: Change files in the workspace. Use when the user asks to edit, fix, add, or delete file contents.
---

# Edit files

## Done when

Each intended change has a successful `write_file` result. Do not claim an edit that the tool did not confirm.

## Steps

1. `read_file` (or `list_dir` then `read_file`) every file you will change. No write without a current read.
2. Change only what the user asked. Keep surrounding code.
3. `write_file` the full new contents of that file. Paths stay inside the workspace jail.
4. If you need a new file, `write_file` it. Parent dirs are created for you.
5. After writes, `read_file` the result if you need to confirm.

Tools: `read_file`, `write_file`, `list_dir` only.
