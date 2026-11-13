# w11-measure report: W11 item 1, the after

Branch `work/2.0.0-ts-w11-measure`, pushed. Status: DONE_WITH_CONCERNS (row (a) is the lead's; the concerns are the targets missed and the
red release gate below). Every number, with its command, evidence file and load, is in `docs/workorders/typescript/after.md` (the tracked
copy of `build/evidence/W11/after.md`; the raw files are beside the original under `build/evidence/W11/`). This report is the index and the
list of what missed.

## What was made

- `docs/workorders/typescript/probes/replay-play.mts --all` (the whole fixture, wall and CPU per event from the kernel through
  `probes/run-rusage.py`, the daemon's CPU from `ps`, totals and a `.json` of per-kind sums), `probes/node-starts.mts`, `probes/feature-task.mts`,
  `probes/agent-task-wait.mts`, `probes/daemon-rss.mts`; `probes/baseline.mjs` (h) and (k) repaired; `scripts/replay-lib.mts` (several blocking
  entries of an event run at once; `REPLAY_CLI` measures another version the same way); `scripts/measure-release.mts` (stale known red skipped,
  the noop pin, one set-aside).
- `docs/workorders/typescript/numbers.json`: the seven afters measured, evidence paths, `provisional` removed; `node scripts/counts.mts` run
  (README's table and the two SVGs regenerated from it) and `--check` exits 0.

## The numbers (full tables in after.md)

| measure | before (W0) | after | load at start |
|---|---|---|---|
| (b1) one-hook gate | 188.3 s | 12.9 s | 3.73 3.49 3.85 |
| (b2) git-guard gate | 326.6 s | 57.2 s | 4.41 3.66 3.90 |
| (c) one-lib gate | 19.0 s | 59.6 s | 4.08 3.80 3.92 |
| (d) release, one-hook, local registry | 937 s | 29.5 s (lib 22.5, content 30.8) | 4.06 4.46 5.13 |
| (e) init+doctor cold / warm | 34.0 / 9.1 s | 39.7 / 1.95 s | 2.75 3.82 5.52 / 4.88 4.27 5.61 |
| (f) update warm | 4.6 s | 1.14 s | 4.88 4.27 5.61 |
| (h) one Bash event: runner / Go and daemon | 90 ms | 123 / 38 ms | 4.89 4.28 5.60 |
| (i) status line, live from the daemon | 67 ms, 3.0 s CPU a minute | 26.6 ms, 0.6 s CPU a minute | 2.61 3.85 5.56 |
| (j) tsc build | 0 s | 0.5 s | 6.21 6.31 5.28 |
| (k) npm pack | 0.84 MB, 1,021 files | 6.95 MB, 1,150 files | 6.46 6.50 5.46 |
| (l) doctor --fresh | 29.8 s | 38.5 s | 4.89 4.28 5.60 |
| replay, summed hook wait (5,583 events) | 1,107 s recorded / 1,647 s 1.9.0 tree | 214.6 s (runner 692 s) | 4.00 5.81 5.27 |
| mean per event / per prompt / per tool call | 198 ms / 7.24 s / 352 ms (recorded) | 38.4 ms / 1.40 s / 69.8 ms | same |
| Stop p50 / p95 | 279 / 6,067 ms | 54.2 / 76.9 ms | same |
| node processes started | 21,384 | 5,305 (derived; runner mode 10,888 counted) | n/a |
| hook CPU | 1,737 s (1.9.0 tree, same method) | 147 s (61 client + 86 daemon) | same |
| hook waiting per feature task (bandwarp, 38 agents) | 2,741 s (1.9 replay) | 528 s, 5.2x | derived from the replays |
| scripted feature task, hook wait | 2,662 ms | 1,111 ms (runner 2,587) | 3.94 / 5.15 |
| daemon RSS idle / after 1,000 events at 8 | n/a | 89 / 180 MB (ps), 139 by its own count | 3.64 5.05 6.66 |

## Targets missed or worse than before, plainly

1. Row (c), the one-lib gate: 19.0 s to 59.6 s. The picker reaches 13 test files where W0's reached 2, among them the worktree test (14.6 s) and repo-lint.
2. (e) cold init and doctor 34.0 s to 39.7 s, and (l) doctor --fresh 29.8 s to 38.5 s: more hooks, more selftests. W8's "under 40 s" holds by 0.3 s.
3. (h) the TypeScript runner alone, 90 ms to 123 ms (the picker's `sh` and `uname` first, and a bigger base).
4. The prompt event: 47 ms (recorded) to 77 ms p50; `reuse-hint` does 46 ms of its own. Against the 1.9.0 tree on the same replay (128 ms) it is faster.
5. W8's reopened line, live Bash p50 under 20 ms: **28.9 ms wall to wall** through the kit's own install (60 calls); by the daemon's proxy line it is
   7 ms p50 (n=274), so the line holds in the measure it was written in and fails in the one a user feels. 9 ms of the 28.9 is starting any `sh` here.
6. The status line render: 26.6 ms live against W8's 15 ms.
7. npm pack: 6.95 MB (the four proxy binaries are 14.8 MB of the 17.2 MB unpacked); the order's lines (under 4 MB without them, 16 MB with) hold.
8. Daemon RSS at 8 workers: 180 MB by `ps` against 150 (139 by the daemon's own count). Idle 89 MB and at 16 clients 180 MB hold.
9. The TypeScript runner alone is not faster than 1.9 on the scripted feature task (2,587 against 2,662 ms); the speedup is the proxy's.
10. The factor on the per-task wait is 5.2x against a 1.9.0 replay, 1.4x if the 1.9 runner's own logged milliseconds are taken as the before; those are not wall times, so the report should use the first and say how it was made.

## Where a number differs from a test or scratch one

- Live Bash wall 28.9 ms (kit install) against 33.9 ms in the replay's scratch and 0.5 ms for the daemon alone over the socket in W8.2's tests.
- Daemon RSS: 180 MB by `ps` against 139 MB by the daemon's own status line, in the same run.
- The kit's own live daemon, up 4 h: 169.6 MB by `ps`.

## Concerns for the lead

1. **The release gate is red on the branch's tip**: repo-lint "no file names a person" on `agents/kwb216-report.md:17` (a home path). `release` stops at its
   gate on it; the 2.0.0 release would be refused. I did not edit that file (another agent's); the release measurement sets the path aside in its scratch clone.
2. **1.9.0 is not published** (npm's newest is 1.8.2). The "1.9.0" in every comparison is `git archive 905e6be` (package.json 1.9.0, the order's first
   commit). The brief's published-package install was not possible; the form used is stated in after.md.
3. The 1.9.0 replay has stalls of 140 to 196 s in single events (a different event in each of two runs); both runs are kept and a trimmed column is given.
4. With a `node` shim on PATH the client's daemon path is bypassed, so the proxy-mode process count is derived (heartbeat only), not counted. Possibly only the shim; not investigated.
5. README, `docs/perf-light.svg` and `docs/perf-dark.svg` changed because `counts.mts` writes them from `numbers.json` (the order's design); they are in the commit.
6. My first feature-task form passed a relative path and every 2.0 hook exited 127 while the timings looked plausible; caught because the runner and proxy
   columns matched. The probe now resolves the path and prints the first non-zero exits.
7. The merge of `origin/work/2.0.0-typescript` (9 commits) into this branch came after the replays; the numbers were taken at e3e9de2.

## Files

`docs/workorders/typescript/after.md`, `numbers.json`, `probes/{replay-play,node-starts,feature-task,agent-task-wait,daemon-rss}.mts`,
`probes/run-rusage.py`, `probes/baseline.mjs`, `scripts/replay-lib.mts`, `scripts/measure-release.mts`, `README.md`, `docs/perf-{light,dark}.svg`,
`packs/manifest-2.0.0.json` (if counts rewrote it), `build.md`. Evidence: `build/evidence/W11/` in the main checkout.

DONE_WITH_CONCERNS docs/workorders/typescript/agents/w11-measure-report.md
