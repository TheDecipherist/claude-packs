---
# hook: making-check.mjs
---
# Write the making line before the first write

<constraints>
Always do:
- Before the first write of a step, put its entry under `## In progress` in `build.md`, with the branch name and one line: `making: <what>; concepts: <each, with its shape>; reuse: <function, where it lives>`.
- Have `design/shape.json` first. A new concept gets its row before the code; a project with none declares `{"concepts": {}}`.
- Update the line when the step changes. A new step gets its own line.

Never do:
- Leave the line for the end of the turn: `making-check` sends the turn back at Stop, and each send-back costs a whole turn.
</constraints>
