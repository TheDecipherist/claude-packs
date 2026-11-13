---
# hook: catalog-entry-exists.mjs
---
# A step naming a reverse-engineered module is not ticked until its catalog entry exists

A module read out of a machine and left out of the user's catalog is lost to the next project: the finding lives in one repo's notes and nobody can ask the catalog for "every filter".

<constraints>
Always do:
- Write `module: <category>/<entry>` on each build step that names a reverse-engineered filter, oscillator, envelope, LFO or effect (`filters/oberheim/matrix1000`, the path under the catalog's category, no extension).
- File the module first (the `file-into-the-catalog` skill), then tick the step.

Never do:
- Tick such a step with no `.md` and `.h` for it in the catalog named in `.claude/layout.json` `catalog`.
</constraints>

## Check
The `catalog-entry-exists` hook (opt-in) refuses a write to `build.md` that ticks a tagged step whose entry is missing. With no `catalog` named it passes.
