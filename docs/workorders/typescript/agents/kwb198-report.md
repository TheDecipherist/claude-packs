# KWB-198 report: the TypeScript laws reach .mts and .cts

Branch work/2.0.0-ts-kwb198 (from work/2.0.0-typescript), worktree .claude/worktrees/kwb198.

## Decision (one rule, one place)

A glob that ends in `.ts`, or in a brace that lists `ts` (`{js,mjs,cjs,jsx,ts,tsx}`), names `.mts` and `.cts` too. `withModuleForms` and `allWithModuleForms` in
packs/base/hooks/lib/glob.mts do it, and two readers apply it:

- `conceptGlobs` (packs/base/hooks/lib/layout.mts): every concept of every pack and of the project becomes globs through it, so a rule's generated `paths:`
  follow (js-ts `js`, `ts`, `js-tests`, `routes`, `entry`, base's `js` and the followFolders extension, fastify, html-ui, ui-craft, full-stack, http-api, mongo, tui).
- `loadChecks` (packs/base/hooks/lesson-checks.mts): a check's `globs`, `exclude` and concept globs. So `**/*.d.ts` in an exclude leaves out `.d.mts` too.

Why, not 40 edits: no pack lists the two forms by hand, a new pack or check gets them without remembering, and the rule is tested once. `.tsx` has no
module form and is left as it is. No pack.json, no check file and no FOLLOWED entry in lib/layout.mts needed an edit (FOLLOWED's brace is expanded on the way out).
Hand-written `paths:` lists: none remain (rules are generated).

## typescript-only

The check format could not tell a new file from an edit, so the least change is one optional field in the lesson-checks reader: `"newFilesOnly": true`
(forbid, but only where the file's text before the write is empty). typescript-only.json carries it. An edit to an existing .js passes, first line
included; a new .js, .mjs or .cjs is refused. `mode` could not take a new value (types.d.mts, not mine to edit), hence a field on `Check` in lesson-checks.mts;
test/pack-content-rig.mts `CHECK_FIELDS` names it.

## Tests (red first, shown red at the base files, green now)

- test/integration/typescript-module-forms.test.mts: a check refuses its fault in web/routes/items.ts, .mts and .cts; no-any.md's `paths:` match lib/x.mts, lib/x.cts
  in a project with a lib/ code folder and followFolders; typescript-only refuses a new .mjs and passes an edit to an existing .js first line.
- test/unit/hooks-lib/glob.test.mts: `withModuleForms` and `allWithModuleForms`.
- The red proof is in the history: a0e322f (fix), 52296cd (the three behavioural files back at the base: three assertions red), then the fix restored.

## The kit scratch

A copy of the kit's tree with the kit's .claude/layout.json and `add js-ts`: `doctor --strict` is OK, with the note "2 rule(s) wait for their first file"
(folders empty, not a rule matching no file). **No layout change is needed in the kit's .claude/layout.json**: the rules' `ts` concept now carries `**/*.mts`,
so the js-ts rules match the kit's code without `followFolders`. (I could not reproduce the 16 reds on the base because the scratch uses this branch's CLI for the install.)

## Notes

- counts.mts rewrote packs/manifest-2.0.0.json (the typescript-only hash and the new test); `--check` green. noop's fixtures did not change.
- One slip: I appended the glob.mts functions with a shell heredoc once, before reading the rule again; the result was read and committed as it is.
- Open: the base's `js` concept still names folders (src, test, tests) and, with followFolders, the layout's code folders; unchanged by design.

Status: see the last line.

DONE_WITH_CONCERNS (gate result below).
