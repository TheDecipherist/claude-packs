# KWB-197 and KWB-195 report (branch work/2.0.0-ts-kwb197, worktree .claude/worktrees/kwb197)

## KWB-197: calls stay slow after an update

### What it was not
The update path itself works. A scratch install with a daemon, a changed lock (a byte appended), then six calls through the picker: the first call is judged by the runner (and starts a daemon for the new name), every later call is the new daemon's (`event` source `daemon`). The client names the same socket the daemon binds, the start lock is per key (the old daemon does not hold the new one's), and the fallback path does reach `startDaemon`. test/integration/proxy-update.test.mts, first case: green before any fix (it stays as the guard).

### Cause 1 (the one behind the 157 ms walls): the daemon ended itself at "400 MB resident" after every burst, then started again
Seen in the kit's own daemon log (~/Library/Caches/claude-packs/daemon-<key>.log): `stopping: 509 MB resident` then `started pid ...`, 12 starts in 3 minutes, one every 1 to 30 seconds. Each restart leaves a gap with no socket (calls fall to the TypeScript runner, 157 to 173 ms) and a daemon with cold workers (the first Pre Bash after it logs `event` 157 ms: suite-once and no-find 143 ms each, which is the cold hook import). The daemons logged before the update, too (600 to 648 MB resident, 01:46 to 02:00Z), so this was not caused by the update; the update only made the figures visible (the old-lock daemon stood idle at 225 MB).
Why: the workers are threads of the daemon, so `process.memoryUsage.rss()` counts every worker's heap. Reproduced on the worktree with 24 overlapping Write events x 3 rounds (the old build): `stopping: 787 MB resident`, `797 MB`, `763 MB`, a new pid after each round. After the pool is warm (every worker has imported every hook) 16 to 20 workers hold 500 to 950 MB, so the 400 MB leak guard fired on a healthy daemon under any real concurrency (the lead plus agents).
Fix: `watch` limits RSS at `maxRss + workers x WORKER_RSS` (48 MB a worker; packs/base/hooks/resident/lifecycle.mts, `Watch.workers`, resident.mts passes `pool.size`). The pool is bounded (32) and its workers recycled by job count and idle time, so the limit still ends a daemon that leaks past what its pool explains.
Test (red first): test/hooks/base/resident-parts.test.mts "the watch ends ...": 500 MB with 16 workers must not stop (red: `500 MB resident|true` twice), 2000 MB with 16 workers must (green both ways).
After: the same burst on the fixed build (24 events x 3 rounds on the kit's own project): one pid for all three rounds, 947 to 968 MB at 18 to 20 workers, no `stopping` line in the daemon log.

### Cause 2 (design gap): the old daemon did not exit on a lock change
The design says it does; nothing implemented it (it idled out after 15 minutes holding 225 MB: pid 3889 in the lead's session is such a daemon). Fix: `Watch.replaced`, true when the project's lock text differs from the one the daemon was named for; the daemon stops (no re-exec) within one tick (resident.mts, `replaced`). Test: resident-parts "the watch ..." case `the lock changed: a new kit has its own daemon|false`, red first (watch had no such stop), and the first proxy-update case kills the old pid in its `finally` in case it were still up.

### Proxy wall of the calls after an update
| | before | after |
|---|---|---|
| kit's own daemon, Pre Bash, calls ~3 s apart (hooks.log, 21:19 to 21:21) | proxy 157, 160, 166, 173 ms (each call met a restarted or missing daemon; the `event` line 157 ms, source `daemon`) | calls 2 to N served by the same daemon: scratch/worktree measurement, Pre Bash proxy 129 ms (first), then 18, 7, 3, 2, 3 ms |
| a burst of 24 Pre Write events, worktree of the kit | daemon restarted every round, calls during the gap 150+ ms | one daemon, same pid across three rounds |
Not measured: the lead's own running daemon (never touched, as briefed; it takes the fix on its next `update`). Note, outside this ticket: a Pre Write in the kit's repo costs 95 to 350 ms inside the daemon (repetition index, template-law/once-only), well over a Pre Bash; the budgets for Write are that, not the restart.

## KWB-195: a selftest's daemon outliving the selftest

Cause: doctor kills a selftest at its timeout with `child.kill()` (SIGTERM); node runs no `finally` on that, and the daemons the selftest started are detached (own session), so they stay up (15 minutes idle, then exit).
Fix: a daemon takes `--exit-with <pid>`; its watch tick (every second, before the busy check) stops it with `the process it was started for is gone` when that pid is dead (SIGKILL included, which no handler could catch). The selftest rig's `start()` passes its own pid on every daemon it starts, and the re-exec arguments keep the flag. Real clients never pass it.
Test (red first): test/integration/resident-selftest-kill.test.mts runs `resident.mjs --selftest` with TMPDIR in a scratch folder, waits for a daemon whose `--serve` path is under it, kills the selftest with SIGTERM and with SIGKILL, and sees no daemon left within 8 s. Red: both cases left a daemon (pid listed). Green after the fix (1.4 s each). Unit: resident-parts `parentGone` case.

## Files
packs/base/hooks/resident.mts, resident/lifecycle.mts, resident/selftest-rig.mts; packs/manifest-2.0.0.json (counts.mts rewritten, --check green); tests: test/hooks/base/resident-parts.test.mts, test/integration/proxy-update.test.mts (new), test/integration/resident-selftest-kill.test.mts (new), test/fixtures/proxy-rig.mts (new, `stopDaemon` and `until` moved out of proxy-install.test.mts, which imports them).

## Notes
- The burst case in proxy-update.test.mts is green before the fix too: a scratch base install stays under 400 MB. It is kept as a regression guard; the red for cause 1 is the resident-parts case.
- The update-path case also passes before the fix (see above).
- Refusals met, both marked right (from the main checkout, where the log lives): once-only (cc8a0498, the new test copied proxy-install's helpers; extracted to proxy-rig.mts) and code-shape (5cb44c8b, a 309-column line; broken up).
- Slip: none with shell file rewrites; all edits by Write/Edit.
- The kit's own installed hooks (.claude/hooks/*.mjs) are not refreshed here; the lead's `update` brings the fix to the kit's daemon.
