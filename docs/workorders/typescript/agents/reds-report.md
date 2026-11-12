# reds: the four reds of wave 2's merge

Branch work/2.0.0-ts-reds. Evidence in `build/evidence/reds/` of this worktree. Load was 7 to 13 throughout (the machine was never quiet); each red was run alone, one run at a time.

None of the four is wave 2's code failing. (2) was a real change of behaviour the test did not know; (1), (3), (4) are wall-time assertions that fail only when the machine is loaded. Wave 2's budgets change is cleared as the cause of them.

## 1. git-guard selftest "kept Stop look: within about a second of GitHub, never its 3 s"
- Alone: green (4 runs at load 7 to 11, `git-guard.mjs --selftest`). Red only in the gate, at 180 s selftest runs under load 30+.
- Cause: the case timed the Stop with a wall clock (`wall < 2500`) against a 3 s slow GitHub; a loaded machine's node start plus the hook's git calls pass 2.5 s.
- Fix (`packs/base/hooks/lib/stop-cache-selftest.mts`): the slow `git-upload-pack` shim now touches `slow-done` when it ends; the case asks whether the Stop returned before GitHub did (`slow-done` absent), with GitHub at 4 s. It measures the cap itself, not a clock.
- Plant: `STOP_LIVE_MS` 1000 to 8000 in the emitted `stop-look.mjs`: red "it did not wait out the slow GitHub ... (got true, wanted false)" (`stopcap-red.txt`); restored: green (`stopcap-green.txt`).

## 2. hook-timing "every installed hook writes one timing line per call"
- Alone: red every time, load or not (`hook-timing-red.txt`): "once-only-index wrote no timing line on PostToolUse Edit".
- Cause: wave 2's PostToolUse answers before its recorders run (`serveEvent`, late hooks); the test read hooks.log right after the reply, before once-only-index's line was written.
- Fix (`test/integration/hook-timing.test.mts`): after each event, wait (bounded, 10 s, 100 ms steps) until every expected hook has a line, then check them all as before. A hook that never writes still fails, after the bound.
- Green: `hook-timing-green.txt` (5 of 5).

## 3. doctor-budgets "doctor is red on a hook that sleeps 300 ms ..."
- Alone: green at load about 10 (`doctor-budgets` run, 4 of 4, and again after the change). Gate failure: `sleeper 331/404`, the regex wanted p95 and worst `3\d\d`.
- Cause: the test pinned p95 and worst to 300 to 399; a loaded machine pushes the worst of 6 calls past 399. Not wave 2's code.
- Fix (`test/integration/doctor-budgets.test.mts`): p50 stays `3\d\d`; p95 and worst accept `[3-9]\d\d` or four digits (the sleep is the floor; the message, hook, event and budgets are still matched exactly).

## 4. git-event-speed "git commit, git add ... never wait on the network or scan the tree"
- Alone: green once (worst 252 ms at load 7), red twice (worst 968 and 1063 at load 7 to 11; 4580 in the gate). p50 is 0 in all. The slow calls are the three `git commit` events only; the first `git-guard` call sees no connection to the silent server (a probe counted connections: none). The cost is the ten or so git processes of the unpushed law (rev-parse, remote get-url, for-each-ref, worktree list, ...), each stretched by load. That is a process count, not a network wait.
- Fix (`test/integration/git-event-speed.test.mts`): the silent server counts the connections it gets, and the test asserts 0 (the exact measure of "never asks GitHub"); the worst bound is 5000 ms, a hang detector (a call that waits on the silent GitHub takes git's 15 s), p50 under 50 ms kept.
- Plant: `offline: true` to `false` in the emitted `branches-ahead.mjs`: red "p50 0, worst 15839 ms" (`netcount-red.txt`); restored: green (`netcount-green.txt`, worst 1087 ms at load 10).
- Open (for commit-cost): git-guard on a commit is 250 ms unloaded and about 1 s at load 10: that is the number the process-count work should bring down.

## Other files
`packs/manifest-2.0.0.json` and `test/fixtures/noop/pinned-manifest.json` (the selftest module is an installed file: `node scripts/counts.mts`, `node scripts/noop-pin.mts`; the diff is `stop-cache-selftest.mjs` changed, per configuration), `build.md`, `agents/reds.json`.

## Checks
`npm run check` exit 0; `node scripts/counts.mts --check` green; changed-tests gate in `build/reds-gate.txt` (see the status below).
