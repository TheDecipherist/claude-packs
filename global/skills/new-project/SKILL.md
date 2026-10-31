---
name: new-project
description: Use when creating a new project, repo, plugin, synth or effects unit, before its first file is written, or when an existing project has no .claude/layout.json yet.
---

# Start a project on the house structure, so the rules fire from the first file

<constraints>
Always do:
- Lay down the structure before the first source file. Every rule, check and skill loads by path, so a file written before the structure exists starts outside every rule.
- Install claude-packs first, in this order:
  1. a synth or effects unit: create it with `python3 ~/projects/synthkit/tools/new_synth.py <Name> --kind synth|effect --brand "<Brand>" --model "<Model>"`, then install the packs in the new folder;
  2. any other project: create the folder and `git init`;
  3. `npx --yes --package ~/projects/claude-packs claude-packs init audio-core [gpu-painter] [...]` (or `--profile <name>` / `--layout <file>` for a tailored layout). This creates every folder and writes the "Project layout" block, with **where each kind of thing goes**, into CLAUDE.md.
- Run the `latest-versions` skill for the whole stack before the first build file pins anything.
- Run `npx claude-packs doctor` and fix every PROBLEM before writing code.
- Put each new file where the "Project layout" block in CLAUDE.md says its kind goes. The folder-law and placement-law hooks refuse anything else.
- Once the skeleton builds, run `npx claude-packs doctor --strict`: every rule must match at least one file and every source file must be covered by a rule. A rule that matches nothing means the structure and the rules disagree; fix the layout, not the rule.

Never do:
- Copy another project's folder to start a new one.
- Invent a folder that isn't in `.claude/layout.json`. Ask the user, add it to the layout, then `npx claude-packs update`.
- Start writing source files "for now" and move them later. A moved file was written without its rules.
</constraints>
