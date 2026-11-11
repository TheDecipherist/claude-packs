# W3 root: hooks read the project root per call

Branch `work/2.0.0-ts-w3-root`, from `work/2.0.0-typescript` (a4eedd3).

## The change

31 hook files declared `const ROOT = ...CLAUDE_PROJECT_DIR...` at import. Each now has no
`ROOT`; every use is a call `projectRoot()` (from `./lib/hook-log.mjs`, added to the file's
existing import), and an import of `resolve` the file no longer used is dropped.

Files (all `packs/<pack>/hooks/<hook>.mjs`):

- base: brief-guard, code-shape, dispatch-once, file-size-guard, folder-law, git-guard,
  inside-the-project, kit-fresh, lesson-checks, look-gate, making, making-check, once-only,
  placement-law, repo-litter, reuse-hint, secrets-guard, shape-law, skill-first, suite-once,
  template-law
- audio-core: param-id-lock, realtime-guard, settings-layer
- synth-creator: chart-first, frozen-files, spec-lock
- stellix: no-shipped-images; zod: schemas-only; postgres: db-wipe-guard;
  reverse-engineering: firmware-out-of-git

Also in git-guard: the two inline `resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd())`
expressions became `projectRoot()`.

## Module-level constants made functions

- `frozen-files.mjs`: `STATE` (join of the root) became `stateFile = () => join(projectRoot(), ...)`.
- `spec-lock.mjs`: `STATE` became `specLockFile = () => ...` (not `stateFile`: template-law
  refused a second `stateFile` in the same pack, so the name says the other job).
- Default parameters (`loadChecks(root = projectRoot())` in lesson-checks,
  `isBlocked(p, base = projectRoot())` in no-shipped-images) are evaluated per call already.
- Top-level arrows (`isSource`, `looksOf`, `rootOf`, `checkoutLayout`, `BY_HAND`) only call it when run.

## Not changed (out of scope, said so)

The count 33 from the grep includes two files under `packs/*/tools/`
(`synth-creator/tools/freeze.mjs`, `base/tools/test-verdict.mjs`); the order limits the change to
`packs/*/hooks`, so they still declare `ROOT`. `packs/base/hooks/lib/writes.mjs` has a `ROOT`
local inside a function (per call, not frozen at import); left alone.

One cosmetic reorder: skill-first's hook-log import names are `asHook, projectRoot, isMain`,
because with the plain order its import block became a 7-line copy of look-gate's in `dup scan`.

## Proofs (after `npm run build`)

- Selftest of all 21 changed base hooks: exit 0 each.
- Scratch installs, `doctor --fresh` with `CLAUDE_PACKS_SELFTESTS=run`: exit 0 for
  `--config synth-creator cpp audio-core`; `--config synth-creator cpp audio-core stellix
  reverse-engineering gpu-painter` (covers chart-first, frozen-files, spec-lock, param-id-lock,
  settings-layer, realtime-guard, no-shipped-images, firmware-out-of-git); `--config full-stack`;
  `--config full-stack postgres` (db-wipe-guard, schemas-only).
  (`--config base` with those packs is refused by the kit: no configuration takes them.)
- `npm run check`: exit 0.
- `test/repo-lint.test.mts`: 6 pass, 0 fail.
- `dup scan --dir .`: 20 duplicates in 15 files (311 sources); none of the pairs
  code-shape/dispatch-once, look-gate/skill-first, repo-litter/firmware-out-of-git.
- `test:changed --base work/2.0.0-typescript`: output `/tmp/w3-root-tc.txt`. 413 tests, 396 pass,
  1 real failure (no-personal-name, known: it lists the typescript work order's own files), 16
  cancelled when the harness killed the run at its time limit (house, kf-refusals, sub37-wb
  known reds; kf-fail-open, review-packs, routes, rule-tests, rust-pack, shape, structure,
  ui-craft cut off). Those eight were rerun alone: see below.
- Rerun of the eight cut-off files alone (`/tmp/w3-root-tc2.txt`): 104 tests, 104 pass, 0 fail.
  The known reds (house, kf-refusals KF-21, sub37-wb WB-4, no-personal-name) are not from this change.
