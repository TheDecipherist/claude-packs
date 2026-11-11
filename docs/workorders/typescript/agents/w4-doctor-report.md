# w4-doctor report (branch work/2.0.0-ts-w4-doctor)

Files: scan-detect, planner, doctor, workorder-check (`lib/*.mjs` to `.mts`), each `git rm`'d first, committed and pushed one by one.

| file | lines before | after | copies removed |
|---|---|---|---|
| scan-detect | 130 | 150 | two raw `JSON.parse(readFileSync)` (package.json read to `readJson`, `namedConfig` to `readLayout`); two `try { readFileSync } catch` to `readText` (one helper `textHas`) |
| planner | 119 | 150 | `readFileSync` to `readText` |
| doctor | 139 | 208 | two inline layout reads to one `readLayout`; `String(e.stderr)` to `childError`; `readFileSync` to `readText` |
| workorder-check | 108 | 118 | `existsSync`+`readFileSync` to `readText` |

## Signatures changed
- `doctor(projectDir, log, { strict, fresh, installing, env })`: `env` is new (default `process.env`). SELFTEST_JOBS and SELFTEST_S are no longer read at import; each call reads them from `env`. `env` passes down to `sharedHash`, `proved`, `remember`, `useJscpd`, `onceOnlyDoctor`, `symmetryProblems`, `statusProblems`, `pageGateProblems`, `hoverGateProblems`, `coverage`, and the selftest children. Importers unchanged (`bin`, `config-cli`, `new`, `workorder-check`).
- `checkWorkorder` and `workorderCheck` take an optional `env` and pass it to doctor. `workorderCheck(dir, name | undefined, ...)`.
- `recommend`, `plannerSkills`, `writeClaudeAiZips`, `hasSelftest`: same.
- doctor was split into `runSelftest`, `runSelftests` (the pool, `max(4, coreBudget)`, 180 s), `selftestProblems`, `skillProblems`; every check and output text kept, in order.

## Faults / behaviour notes (kept today's behaviour unless stated)
1. doctor's lesson-checks selftest failure used the whole `String(e.stderr)`; `childError` gives only the first line (as the brief says), so that problem now shows less of a multi-line stderr. Not covered by any test I found. The lead may want a `childError`-like owner that keeps all lines.
2. doctor read layout.json with `JSON.parse`, which threw when it was missing; `readLayout` returns an empty layout. A project with a lock but no layout.json used to crash doctor; now it reports on an empty layout (config checks earlier already return `[]` when it is missing).
3. `skillFor` with no descriptions used to throw on destructuring; it returns null now. `claudeAiSkillFiles('nonesuch')` throws a named error instead of a TypeError.
4. `types.d.mts` `Configuration.preamble` is `readonly string[]`, but every config.json holds `{ always, never }` (claude-md.mts declares its own `Preamble`). planner narrows it from `unknown`. Proposed: `preamble?: { always: readonly string[]; never: readonly string[] }` in types.d.mts.
5. `LayoutFolder` lacks `planned?: boolean` (doctor reads it via an `in` check). Proposed type addition.

## Types proposed for types.d.mts
`Preamble` (as above), `LayoutFolder.planned?: boolean`. Defined beside their modules: `DetectContext`, `Recommendation`, `PackFound` (scan-detect), `DoctorOptions` (doctor), `KitSkill`, `CheckOptions`, `WorkorderCheckOptions` (workorder-check), `ClaudeAiSkill`, `PlannerOptions` (planner).

## New emitted files (for `.gitignore` and noop's lists)
`lib/scan-detect.mjs`, `lib/planner.mjs`, `lib/doctor.mjs`, `lib/workorder-check.mjs` (git shows each untracked; the removed tracked ones are staged deletions). No installed file changed (these are kit-only).

## JSON ratchet
`test/json-ratchet.test.mjs` says 303 raw calls left: lower `RAW_CALLS_LEFT` from 307 to 303 (the lead owns it; I did not edit it).

## Proofs
- `npm run build`, `npm run check`: exit 0.
- repo lint (`test/repo-lint.test.mts`): 7 pass.
- Unit tests (new): `test/unit/lib/scan-detect.test.mts` (4), `planner.test.mts` (4), `doctor.test.mts` (3; plants an unregistered hook, a missing layout folder, a hanging selftest), `workorder-check.test.mts` (4). Existing `doctor-selftest.test.mts` passes.
- `test/doctor-cache`, `doctor-timeout`, `hook-timing`, `hook-proof`, `kit-guards`, `scan`, `planner`, `workorder-check` tests: all pass. `test/suggest.test.mjs` does not exist.
- `npm run test:changed -- --base work/2.0.0-typescript` (`/tmp/w4-doctor-tc.txt`): 40 pass, 0 fail.
- `node bin/claude-packs.mjs doctor --dir . --strict`: OK: base.
- No hook changed, so no hook selftest or worktree case needed.
- `json-ratchet.test.mjs` fails only because the count fell (303 < 307), as above.
- No hook refusal met in this slice except git-guard once (an unpushed commit before the next `git commit`); right, I pushed. Not marked via `logs mark` (no id was shown).
