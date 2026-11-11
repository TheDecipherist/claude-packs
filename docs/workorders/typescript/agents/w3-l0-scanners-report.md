# W3 w3-l0-scanners report

Branch `work/2.0.0-ts-w3-l0-scanners`, worktree `.claude/worktrees/w3-l0-scanners`. Status: DONE_WITH_CONCERNS.

## Files (lines before -> after)

| file | before | after | note |
|---|---|---|---|
| identifier-runs | 13 | 13 | |
| prose | 11 | 11 | |
| audience | 15 | 16 | `text` is `unknown` (payload field), narrowed |
| glob | 33 | 35 | `globToRegExp`, `matchesAny` unchanged (InstalledGlobModule holds) |
| cpp-scan | 94 | 98 | exports kept; `AudioBody` added |
| rust-scan | 139 | 144 | exports kept; `LookupMatch` added |
| build-slots | 31 | 40 | module-level `process.env` constants removed |
| core-budget | 67 | 77 | env, platform now parameters; layout read through `readJson` |

No copies removed (none of the eight held a helper an owner has). `projectLayout` now uses `readJson` (json.mts); a layout file that
parses to a non-object gives `{}` (before: it was returned as is).

## Signature changes and importers

- build-slots: `DIR`, `SLOTS` constants gone. New `buildSlots(env, tmp = tmpdir())` returns `{ dir, slots }`; `slotAt(dir, n)`;
  `slotOwners(dir)` (no default). Importers: `packs/synth-creator/tools/buildq.mjs` (`const { dir: DIR, slots: SLOTS } = buildSlots(process.env)`),
  `packs/base/hooks/lib/run-discovery.mjs` (`slotOwners(buildSlots(process.env).dir)`).
- core-budget: `coreBudget(env, layout = {}, cores)` (env required, was `process.env`); `gentle(command, { platform, env })` both required.
  Importers updated: `lib/doctor.mjs` (`coreBudget(process.env)`), `buildq.mjs` (`gentle(..., { platform: process.platform, env: process.env })`).
  `scripts/test-changed.mjs` and `packs/base/tools/quiet-test.mjs` already passed env; `test/core-budget.test.mjs` already passed all arguments.

## Faults and notes

- None found in behaviour.
- `lineAt` in cpp-scan tripped template-law against a private, different `lineAt` in `code-shapes.mjs` (takes a line-start table, not the text, not exported). Marked `one-off:` with the reason; not a copy.
- Commit 1 included the 8 emitted `.mjs` because `git commit -- <paths>` takes ignored files named on it (I named them); commit 2 untracks them again (`git rm --cached`). Net tree is correct; history has the two commits.
- A Bash `python3` edit of three importers was accepted with a hook advisory ("could not read what this command writes"); the edits are small and were verified by build, selftests and tests.

## Proposed for types.d.mts

- `Env = Readonly<Record<string, string | undefined>>` (core-budget defines it; the same shape is inlined in `HookContext.env`).
- `BuildSlots`, `AudioBody`, `LookupMatch`, `BudgetLayout`, `GentleOptions` stay beside their modules.

## Proofs

- `npm run check`: exit 0. `test/repo-lint.test.mts`: 6 of 6 pass (gates 11 and 12 included).
- Selftests OK: template-law 26, code-shape 19, once-only 18, shape-law 58, brief-guard 23, making-check 39, folder-law 16,
  placement-law 9, lesson-checks 4 checks, dispatch-once 16, skill-first 15, repo-litter 10, file-size-guard 9, look-gate 9.
  The synth-creator, audio-core, zod, stellix and reverse-engineering hooks cannot run from the source tree (they import the
  base lib by installed path); not run in place. A scratch `doctor --fresh` run over a synth-creator install was started and stopped at the 120 s limit, no result.
- `test/every-language`, `rust-pack`, `core-budget`, `rust-dry`, `cpp-pack`: 68 of 68 pass.
- New `test/unit/hooks-lib/scanners.test.mts`: 8 of 8 pass (includes planted misses and bad values).
- `test:changed --base work/2.0.0-typescript` (output `/tmp/w3-l0-scanners-tc.txt`): 133 tests, 127 pass, 6 fail. All six are
  not from this slice: `house` (2; both also fail in the main checkout on the base branch, run for the two names), `no-personal-name`
  (names in `docs/workorders/typescript/PROMPT.md`, `probes/proxy/*.mjs`, `workorder.md`), and three `noop` tests (the files.mjs, git-run.mjs, hash.mjs, source-exts.mjs of W2 are new installed files not yet in the noop lists).
