# kwb208-210 report (session 2, wave 3)

## KWB-208: kit-fresh and a later-version branch stacked on this checkout
Fix: `kitVerdict` (`packs/base/hooks/lib/kit-fresh-look.mts`) leaves out of "newer work" a ref whose merge-base with HEAD is not an
ancestor of `origin/main`, that is, a branch made from this checkout's own branch (the next work). A branch made from main still
counts (its fork point is on main). With no `origin/main` known, nothing is excluded (the old behaviour).
Selftest (`kit-fresh-selftest.mts`, `stackedRepo`): 3 new cases (stacked branch: commit not refused, not named at start; its twin made
from main still refused). Red first: `build/evidence/kwb208-210/red.txt`; green: `green.txt` (kit-fresh 27 cases OK).
The worktree case for kit-fresh already exists and is unchanged.

## KWB-210: no-polling and a wait on a process
Fix: `pollingIn` (`packs/base/hooks/lib/polling.mts`) removes `tail [opts] --pid=N [opts] /dev/null` before judging, so that blocking
wait passes; `tail --pid=N -f build/x.log` and any sleeping loop (`while kill -0 N; do sleep 1; done`) still refuse. `caffeinate -w N`
and `wait N` already passed; now held by cases. Selftest: 5 new cases (no-polling 17 cases OK), plus 2 asserts in
`test/hooks/base/no-polling.test.mts`. Red first: `red.txt`. The hook's worktree case (`worktreeCase` in no-polling.mts) is unchanged and green.

## Files changed
packs/base/hooks/lib/kit-fresh-look.mts, kit-fresh-selftest.mts, polling.mts; packs/base/hooks/no-polling.mts;
test/hooks/base/no-polling.test.mts; build.md (making line); packs/manifest-2.0.0.json (node scripts/counts.mts);
test/fixtures/noop/pinned-manifest.json (node scripts/noop-pin.mts; 12 differences, all four installed files of mine across configs).
Merge note: the manifest and the pin are generated; on a clash rerun `node scripts/counts.mts` and `node scripts/noop-pin.mts`.

## Gate
`npm run check` 0; `node scripts/counts.mts` run. `npm run test:changed -- --base origin/work/2.0.0-typescript` (build/kwb208-210-gate.txt):
489 tests, 6 failed: (a) 3 noop tests and (b) the manifest line: the generated manifest/pin, fixed after (noop.test 5/5 pass);
(c) WB-4 hook-selftests: load timeout, passes on rerun (build/kwb208-210-rerun.txt); (d) git-guard's selftest "kept Stop look within
about a second" (a timing case, 142 s under load, not a file I touched; not rerun, open); (e) repo-lint "bare npx claude-packs" at
`docs/workorders/typescript/agents/kwb199-report.md:18`, another agent's report, not mine.
No refusal met needed marking wrong.
