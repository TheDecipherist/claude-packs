---
# concepts: tests, build
paths:
  - "placeholder"
---

# The generated machine documents are current, or the build fails

A reference document generated from the engine goes stale the day a parameter is added or a default moves, and nobody reads it again to see. A generator that writes the time or walks a folder in directory order gives a different file each run, so no comparison can hold it.

<constraints>
Always do:
- Wire `docs-current` into the project's tests as a gate, with the generator's command at `commands.docs` in `.claude/layout.json`.
- Commit the regenerated documents in the same commit as the engine change that moved them.
- Make the generator deterministic: sorted order, no timestamps, no locale.

Never do:
- Edit a generated document by hand to make the gate pass.
- Leave the gate out of the project's test command where a generator exists.
</constraints>

## Check

`tools/docs-current.mts` runs the generator twice and compares both runs with the committed documents; it exits 1 on any difference.
