# W3 layer 1, slice w3-l1-selftests: report

Branch work/2.0.0-ts-w3-l1-selftests. Files: hub-rig, look-gate-selftest, skill-first-selftest (all `.mjs` to `.mts`).

## Per file (lines before to after)
- hub-rig: 30 to 40. Removed the own `RUNNER` path and `spawnSync` copy: `run` calls `runHook` (selftest.mts). Temp folder through `scratchDir`; layout JSON through `toJson`. Exports kept (`hubRepo`), plus a new `HubRepo` interface.
- look-gate-selftest: 51 to 48. Removed the own `spawnSync` of git rev-parse (now `gitOut` with cwd and env) and the two own spawns of the hook (`key` and `saidAfter` now call `runHook`, `--key` by the by-hand mode). `selftest(hook: string): number` kept.
- skill-first-selftest: 49 to 49. Typed only; `toJson` for the transcript lines. `selftest(hook: string): number` kept.

## Signatures changed
None. Importers (git-guard-selftest.mjs, trunk-lag-selftest.mjs, look-gate.mjs, skill-first.mjs) unchanged.

## Behaviour notes
- `hub-rig.run(hookFile, payload, cwd, project)` now goes through `runHook(hookFile, project, {session_id, cwd, ...payload})`. runHook has no separate process cwd, so the child's process cwd is the project, not `cwd` (before: `cwd`). Only the trunk-lag Stop-from-worktree case differed; its selftest passes (payload `cwd` carries the worktree).
- look-gate's `saidAfter` used to run the hook directly; it now goes through run-hooks like a real event. Same output.

## Faults found
None.

## Types proposed for types.d.mts
`HookRun` (`{status, stdout, stderr}`) is exported from selftest.mts; `HubRepo` is exported from hub-rig.mts. No change needed.

## Proofs
- `npm run build` ok; `npm run check` exit 0.
- repo-lint test: 6 pass, 0 fail.
- Selftests: look-gate 9 cases OK; skill-first 15 OK; kit-fresh 20 OK; git-guard OK (18 token, 44 house refusals, 32 passes, 25 pushed-law, 9 owner-push, 9 trunk-law).
- No unit test (no logic of their own beyond the selftests).
- test:changed (base work/2.0.0-typescript): 36 pass, 4 fail. Known reds: house's two, no-personal-name. One NEW red, caused by this slice: noop.test.mjs "full-stack: an update keeps an existing project's own layout..." reports `.claude/hooks/lib/hub-rig.mjs` changed but not in FULL_STACK_CHANGED (test/noop.test.mjs). hub-rig's emitted text differs from the released one. Fix for the lead: add `'.claude/hooks/lib/hub-rig.mjs'` to that list (I may not edit tests outside my slice).
