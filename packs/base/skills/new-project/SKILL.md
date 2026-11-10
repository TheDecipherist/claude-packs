---
name: new-project
description: Use when starting a new project, when the kit has just been added to a repo, or when code needs a folder the layout does not have.
---

# Start a project so the laws reach its code (one job: every source file is in a folder the layout names)

A file can only be judged where the layout knows it. `folder-law` keeps new source inside the layout from the first write, and the rules for each language follow it there.

<constraints>
Always do:
1. For a new project, run `new <name>`: the house files, a git repo on a work branch, and the kit installed. Name its kind with `--config <name>`; `configs` lists them.
2. For a repo with code in it, run `suggest`, then `init --auto`. The install adds the top-level folders your source is in to `.claude/layout.json`, and says which.
3. Read the install's last lines, then run `doctor --strict`. It fails on a source file no rule covers and a rule that matches nothing. Fix those now, while they are few.
4. Decide where each kind of thing goes before the first file of that kind, and write it in `.claude/layout.json`: `folders` for where, `kinds` for what goes there.
5. When code needs a new folder, add it to `layout.json` first, then run `update`, then write the file. `folder-law` refuses it the other way round.
6. In a project that keeps code in several folders, run `survey` and give Claude the prompt, so the layout is fitted to the real tree.

Never do:
- Write source first and sort the folders out later: a file outside the layout gets no folder law, and a project that grows that way has to be moved.
- Put a new kind of code in an unrelated folder because that one is allowed.
- Add a broad folder like `.` or `**` to the layout to make a refusal go away.
</constraints>
