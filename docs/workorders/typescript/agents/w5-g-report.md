# W5 g: a selftest proved once per run

## Change
- `test/kit-cli.mts`: new export `selftestOnce(dir, hook)` appended. It keys the installed hook with `selftestKey(file, sharedHash(claudeDir, layout.guards))` (the same key doctor uses), returns a pass without spawning when `proved(key)`, otherwise runs the selftest and `remember`s only a pass.
- `test/hooks/hook-rig.mts`: `holdsTheContract`'s "its selftest passes in an install" calls `selftestOnce`.
- `test/hooks/base/hook-selftests.test.mts` (WB-4): the planted-fault doctor run no longer passes `--fresh`. The first doctor run (`CLAUDE_PACKS_SELFTESTS=run`) already honoured the cache. The planted hook has changed bytes, so doctor runs it, it fails, and it is the only failure. This is the "a cached pass does not hide a changed hook" proof. Test names unchanged. `lib/selftest-cache.mts` needed no new export.

## Plants (scratch script, fixture copy of the base install, one run folder)
- first call: ran, pass (status 0), remembered
- second call: not spawned (status 0, "proved earlier in this run")
- hook bytes changed and selftest broken: status 1 (ran, red, cache did not hide it)
- again: status 1 (failure never remembered)

## Measured (4 files, --test-concurrency=6, summed selftest-test seconds)
- before (main checkout): folder-law 19.6 + git-guard 58.3 + no-find 19.5 + WB-4 118.5 = 215.9 s (wall 119 s)
- after: 20.6 + 59.7 + 19.8 + 84.3 = 184.4 s (wall 93 s)
The saving here is WB-4 (-34 s): hooks the per-hook tests proved first are skipped by doctor. The per-hook tests did not skip, because they ran at the same time as WB-4 (separate processes), before anything was remembered. How much is saved in a full run depends on which file finishes a hook first, so it is not deterministic. Full dedupe would need ordering (WB-4 first), which test files other than mine would have to do.

## Decision
WB-4 keeps its subject (doctor runs selftests and reports a failing one) without `--fresh`; a full forced rerun was the duplicate. `npm run build` and `npm run check` exit 0.
