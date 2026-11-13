# W11 item 1: the "after" (agent w11-measure)

Measured on this Mac (darwin arm64, 18 cores, node v26.12.1) on 2026-11-13, alone, at the order's tip e3e9de2 (the 9 commits merged
into the branch afterwards touch no hook, lib or pack file the numbers below depend on). Every number has its command, its evidence
file (under `build/evidence/W11/`, copied here as the tracked `docs/workorders/typescript/after.md`) and the load average (1, 5, 15 min)
beside it. The machine is not idle between runs: Finder, WindowServer and OrbStack keep the 1-minute load near 2 to 4 with nothing of
ours running; a row taken at 5 or over is marked and was taken again where it mattered.

"Before" is W0's (`build/evidence/W0/baseline.md`). Where W0's number came from bandwarp's own log under its load (the replay fixture),
the same replay is also run here on the 1.9.0 tree by the same method, and both are given. **1.9.0 is not on npm** (the registry's
newest is 1.8.2; 1.9.0 was folded into 2.0.0, decisions.md), so "1.9.0" here is `git archive 905e6be` (package.json 1.9.0, the order's first
commit, the tree W0 measured) unpacked to `build/scratch/ep19/package` with this repo's `node_modules` linked; the published-package
form could not be used. Say so wherever a 1.9 number is quoted.

## Row (a): the whole suite

Left open: the lead's (d-32). Not run here.

## Rows (b), (c): gates (`node docs/workorders/typescript/probes/baseline.mjs build/evidence/W11`; `baseline-measured-run1.md`, `gate-b*.log`, `gate-c.log`)

| row | before (W0) | after | load at start | picked |
|---|---|---|---|---|
| (b1) no-find touched | 188.3 s | **12.9 s** (runs 13.3, 12.6; exit 0) | 3.73 3.49 3.85 | 2 of 372 test files (before 5 of 87) |
| (b2) git-guard touched | 326.6 s | **57.2 s** (56.2, 58.3; exit 1) | 4.41 3.66 3.90 | 2 of 372 |
| (c) lib/layout touched | 19.0 s | **59.6 s** (59.5, 59.7; exit 1) | 4.08 3.80 3.92 | 13 of 372 (before 2 of 87) |

Reds in (b2) and (c) are the probe's own and the tree's: "gate 5: the emitted files are current" is red because the probe edits a
`.mts` and does not rebuild it, "no file names a person" was red on this tree (see Findings 1), and (c) adds the worktree test.
**(c) is slower than before (19.0 s to 59.6 s), a target missed**: the picker now reaches 13 files, among them the 14.6 s
worktree-case test and the repo-lint file, where W0's picker reached 2. Inside a release the one-hook gate is 20.3 s
(`measured-hook.json`).

## Row (d): the release, commit to npm (`release-measure-hook.txt`, `measured-hook.json`, `release-dry-run.txt`)

Command: `node scripts/measure-release.mts hook lib content` (verdaccio on a local registry, a scratch remote, never npm or GitHub).
- one-hook change (no-find): **29.5 s** from `npm run release` to the registry showing the version (gate 20.3, generators 3.5, publish
  3.5, proxy 0.4), load 4.06 4.46 5.13 at start. W0: 937 s (about 32x). W9 had measured 22.8 s; the gate is bigger now (more tests reached).
- one-lib change: **22.5 s**; content change: **30.8 s** (taken before the probe pinned the noop list; load 4.03 4.29 5.15).
- `npm run release major --dry-run` on the clean committed tree: plans 1.8.2 to 2.0.0, 0 refusals, planned 32.0 s, wall 1.67 s,
  load 4.1 4.4 5.1. The first run of the one-hook case was refused by the gate (a red on the tree, Findings 1), the real release would be too.
- Not run: the push, `npm publish` and GitHub release for real.

## Row (e), (f), (l): init, update, doctor (`retake/baseline-measured.md`, taken after the first run in `baseline-measured-run1.md`/`baseline-run2.out`)

| row | before | after | load at start |
|---|---|---|---|
| (e) init + doctor, cache empty | 34.0 s | **39.7 s** (init 38.9, doctor 0.85); other runs 40.2, 39.9 | 2.75 3.82 5.52 |
| (e) init + doctor, cache warm | 9.1 s | **1.95 s** (init 1.10, doctor 0.85) | 4.88 4.27 5.61 |
| (f) update, warm | 4.6 s | **1.14 s** (1.12, 1.16) | 4.88 4.27 5.61 |
| (l) doctor --fresh | 29.8 s | **38.5 s** (38.3, 38.7) | 4.89 4.28 5.60 |

**Cold init and doctor --fresh are slower than before** (34.0 to 39.7 s, 29.8 to 38.5 s): more hooks, more selftests, and the
proxy and daemon selftests. The W8 line "under 40 s uncached" holds by 0.3 s; the comparison with W0 is a regression of 17 % and 29 %.

## Row (h): one Bash event through the install's entry (`retake/baseline-measured.md`, `baseline-measured-run1.md`)

Command changed since W0 (the entry is the `sh` picker, not `run-hooks.mjs`), so the same thing is taken end to end: the entry's own
command, a `ls` payload, 10 starts, a base install.
- TypeScript runner (no binary in the cache): **123 ms** median (115 to 133), load 4.89 4.28 5.60; the first run 133 (5.97 6.27 5.25). W0: 90 ms with 6 hooks.
  The runner is slower than 1.9's node-per-entry on one event because the picker (`sh`, `uname`) runs first and base now has more hooks.
- Go client and warm daemon: **38 ms** median (32 to 48), same load. The first run 35 ms.

## Row (i): the status line

- Same command as W0 (`node .claude/tools/statusline.mjs`, scratch install, no daemon): **77 ms** a render, 0.06 s CPU, 3.60 s CPU a minute
  at refreshInterval 1 (`retake/baseline-measured.md`; W0: 67 ms, 3.0 s a minute). This path is now the fallback only.
- **Live, as a session runs it** (`sh .claude/hooks/bin/hook-proxy status` in the kit's own install, daemon serving, 40 renders): **p50 26.6 ms**
  wall (24.5 to 35.9), **0.010 s CPU a render = 0.6 s CPU a minute** at refreshInterval 1; `live-main-install.txt`, load 2.61 3.85 5.56. W8's line
  was 15 ms p50 for the render; 9 ms of the 26.6 is the cost of starting any `sh` here (below), so the render itself is about 17 ms. **The 15 ms line is
  missed by wall to wall (26.6 ms)**.

## Row (j): tsc's build

`npm run build` (clean-emitted, `tsc -b`, the proxy check): **0.5 s** warm (514, 534, 493 ms; `baseline-measured.md`); `tsc -b --force` after
`clean-emitted`: **0.43 s** (`tsc-cold.txt`; the compiler is fast enough that cold and warm are the same second). W0: 0 s (no build step).

## Row (k): npm pack (`pack-parts.txt`)

`npm pack --dry-run --json --ignore-scripts`: **6.95 MB packed, 17.2 MB unpacked, 1,150 files** (W0: 0.84 MB, 2.39 MB, 1,021 files; 8.3x the
packed size). Five files (the four proxy binaries and one more) are 14.8 MB of it; without them the package is **3.27 MB unpacked**
(the order's lines: under 4 MB without the binaries, under 16 MB with them: both hold). Packed size grew 8x because the package now ships the binaries.
(The probe's first form parsed npm's output with the `prepare` script's lines in it and printed NaN; it now passes `--ignore-scripts`.)

## The replay, played in full (`probes/replay-play.mts --all [--proxy]`, `replay-proxy.md`, `replay-runner.md`, `replay-v19.md` and their `.json`)

The fixture (5,583 events from bandwarp's log: 153 prompts, 124 Stops, 2,747 tool calls) is played event by event, every Stop with a 6 s gap
for the detached refresh (a commit and a push before every 5th Stop, a git remote answering after 1.5 s), each event through the install's own
settings command (the picker; for 1.9.0 the several entries of an event run at once, as Claude Code runs them). Wall and CPU of each event
come from the kernel (`probes/run-rusage.py`: wall from spawn to exit, the CPU of the command and every descendant it waited for); the daemon's
CPU is `ps` before and after. Every total is a sum over the played events.

| | 1.9.0 tree, same method (run 2) | 2.0 TypeScript runner | 2.0 proxy and daemon (the product) | bandwarp's own log (W0, 1.9 under its load) |
|---|---|---|---|---|
| summed hook wait | 1,647.4 s (1,311.0 s without two stalls) | 692.3 s | **214.6 s** (repeat 213.7 s) | 1,107.4 s |
| mean per event | 295.1 ms (234.9 trimmed) | 124.0 ms | **38.4 ms** | 198.4 ms |
| per prompt (all events / 153 prompts) | 10.77 s (8.57 s trimmed) | 4.52 s | **1.40 s** | 7.24 s |
| per tool call (its Pre and Post / 2,747) | 482.9 ms (360.6 trimmed) | 238.2 ms | **69.8 ms** | 351.7 ms |
| hook CPU (waited descendants) | 1,737.1 s | 585.1 s | **61.1 s** + 85.9 s in the daemon = 147.0 s | not recorded |
| Stop p50 / p95 | 2,250 / 3,032 ms | 123 / 144 ms | **54.2 / 76.9 ms** | 279 / 6,067 ms |
| prompt p50 | 128 ms | 129 ms | **77 ms** | 47 ms |
| Pre Bash p50 / p95 | 174 / 317 ms | 129 / 151 ms | **33.9 / 47.9 ms** | 105 / 733 ms |
| Pre Write p50 | 306 ms | 147 ms | **52.7 ms** | 235 ms |
| Pre Edit p50 | not kept per row here | 148 ms | 42.1 ms | 123 ms |
| load at start | 5.83 8.78 7.88 | 5.48 4.33 3.94 (after a 21 min run) | 4.00 5.81 5.27 | n/a |

- The 1.9.0 totals carry stalls: run 1 had one 166 s PostToolUse Bash, run 2 a 196 s Pre and a 140 s Post Bash (different events each time, so
  not one planted payload; a stalled hook of 1.9 or the machine, not told apart). Both runs are kept (`replay-v19-run1.*`, `replay-v19.*`); the
  trimmed column removes the two run-2 events (`replay-v19-trim.md.json`). Run 1 summed 1,306.2 s, 5,583 events, CPU 1,587.8 s. The p50 and p95 rows
  are not moved by the stalls.
- The 85.9 s daemon CPU is the daemon's whole life over the 26 minutes of the run (12 of them the Stops' gaps) including its sampler; per event
  it is 15 ms, and the daemon sat idle most of the time.
- The proxy replay's wall includes 9 ms of process start that a hook in a real session also pays (Claude Code starts the same `sh`).
- The prompt event got slower than W0's 47 ms (to 77 ms p50): `reuse-hint` does 46 ms of its own work (`replay-proxy.md`, hook table). On the
  1.9 tree the same event is 128 ms, so against 1.9 it is faster; against bandwarp's recorded 47 ms it is not. **A target missed: the prompt wait**.
- The first proxy run's twin (`replay-proxy-b.*`) was meant to be the runner mode: the install had put the binary in the scratch HOME's cache, so it
  went through the proxy too. It is kept as a repeat (213.7 s against 214.6 s). The probe now takes that binary out for the runner mode.

### Node processes started

- 1.9: **21,384** over the fixture's 5,583 events (the runner lines per event, summed from `test/fixtures/replay/bandwarp-hooks.jsonl`'s `procs`).
- 2.0 TypeScript runner: **10,888**, counted with a `node` shim on PATH (`node-starts.md`): 1 runner per blocking event plus the async heartbeat on every
  tool event (5,583 + 5,305).
- 2.0 proxy and daemon: **5,305** (the async heartbeat on each of the 5,305 tool events; Stop, prompt and SessionStart start none). **This one is
  derived, not counted**: with a `node` shim first on PATH the daemon was bypassed (69 of 69 events judged by the runner, `hooks.log`), so the
  shim shows 16,471 for this mode and is not the number. Evidence for the derivation: the replay's client CPU is 11 ms an event, below one node start.

## The hook waiting per feature task (`probes/agent-task-wait.mts`, `agent-task-wait.md`)

bandwarp's agent-tagged events (14,588 events of 38 agents, read-only) filed by the worktree each agent worked in; each task's calls by kind
times that kind's mean wall in the full replays above (a kind with no hook, such as Monitor, costs 0). Before is two things: the `ms` the 1.9
runner logged (714.6 s, its own time, not the wall), and the 1.9 replay's mean wall (the same method as the after).

| task | agents | events | 1.9 replay (s) | 2.0 proxy (s) | factor | 2.0 runner (s) | factor |
|---|---|---|---|---|---|---|---|
| settings | 4 | 2,075 | 408.9 | 76.6 | 5.3x | 264.5 | 1.5x |
| macdsp | 3 | 2,106 | 389.2 | 75.8 | 5.1x | 254.7 | 1.5x |
| looks | 3 | 1,664 | 305.3 | 59.8 | 5.1x | 200.1 | 1.5x |
| presets | 4 | 1,357 | 264.2 | 49.5 | 5.3x | 173.1 | 1.5x |
| macrig | 4 | 1,673 | 312.9 | 60.3 | 5.2x | 205.5 | 1.5x |
| developer | 3 | 1,129 | 216.2 | 41.2 | 5.2x | 140.2 | 1.5x |
| host | 2 | 523 | 96.1 | 18.8 | 5.1x | 62.8 | 1.5x |
| other (kit work, no worktree of bandwarp) | 15 | 4,061 | 748.0 | 146.1 | 5.1x | 488.5 | 1.5x |
| **all** | 38 | 14,588 | 2,740.8 | 528.2 | 5.2x | 1,789.5 | 1.5x |

(The 1.9 replay column is the trimmed run.) The logged column and its 1.4x are in the file; they are not wall times and are not used as a before.

## One scripted feature task (`probes/feature-task.mts`, `feature-task-{v19,proxy,runner}.json`)

A knob added to a planted panel and a gain changed in a planted DSP block: prompt, 2 Reads, grep, ls, 2 Edits, `git diff --stat`, `git status`,
`git add`, `git commit`, Stop (12 steps, 22 hook calls with their Posts), the edits and the commit really made between Pre and Post, each
event given to all the blocking entries of the install's settings at once, 7 runs on a fresh copy of a `synth-creator cpp audio-core` install.
Median hook wait (end to end in brackets), 0 refusals in every run:

| install | hook wait median (min to max) | end to end | load at start |
|---|---|---|---|
| 1.9.0 tree (`git archive 905e6be`) | **2,662 ms** (2,624 to 2,736) | 2,738 ms | 3.94 5.60 7.08 |
| 2.0 proxy and daemon (a daemon per run, so the first event of each run starts one) | **1,111 ms** (1,062 to 1,145) | 1,177 ms | 5.15 5.75 7.10 |
| 2.0 TypeScript runner | **2,587 ms** (2,535 to 2,597) | 2,652 ms | 5.34 5.78 7.09 |

2.4x with the proxy. **The TypeScript runner alone is not faster than 1.9 on this task** (2,587 against 2,662 ms): it is one process where 1.9 ran
several in parallel, and each costs the same as a few of them. Per step with the proxy: the first prompt 109 ms (daemon start), the first Read 146 ms,
then 29 to 68 ms, the Stop 162 ms (the first look at the remote of a cold project). A first form of this probe passed a relative path, every hook
exited 127, and the "2.0" runs read 400 ms; found because the runner and proxy columns matched, fixed (absolute path) and the exit codes are now
read.

## The daemon's RSS (`probes/daemon-rss.mts`, `daemon-rss-8.md`, `daemon-rss-16.md`)

Scratch install of bandwarp's pack set, its own cache, 1,000 live-like events through the picker (Read, Pre and Post Bash, Write and Edit, Stop),
`ps` RSS; lines: under 100 MB idle (2 warm workers), under 150 MB with the pool grown to 8, 250 MB at 16, 300 MB with the sampler.

| state | daemon (ps) | with the sampler | the daemon's own count | line |
|---|---|---|---|---|
| idle after the first events, 2 workers | **89 MB** | 99 MB | 58 MB | under 100: met |
| after 1,000 events, 8 clients (8 workers) | **180 MB** (peak read 182) | 193 MB | 139 MB | under 150: **missed by ps (180), met by the daemon's own count (139)** |
| after 1,000 events, 16 clients (pool capped at 8) | **180 MB** (peak read 186) | 192 MB | 138 MB | under 250 and 300: met |
| 150 s later, idle | **96 MB** | 109 MB | (status still says 8 workers, 139 MB) | under 100: met |

Load at start 3.64 5.05 6.66. The two counts differ by 40 MB: `ps` counts the pages the process has resident (V8 heaps of the workers' isolates,
malloc, page tables); the daemon's number is its own sum. The kit's own live daemon (this checkout, up 4 h 4 min, in use all day): **169.6 MB** by `ps`.
W10b's 60-minute soak read 227 MB at 8 workers at load 15 (d-35).

## Live numbers through the kit's own install (read-only use; `live-main-install.txt`, load 2.61 3.85 5.56)

- Bash event, `sh` picker to Go client to daemon, wall by `wait4`, 60 calls: **p50 28.9 ms**, p95 about 43.9 ms, min 25.7. **W8's reopened line "live Bash
  p50 under 20 ms" is missed by wall to wall (28.9 ms)**; 9 ms of it is the floor for starting an `sh` here (`sh -c true`: 8.5 to 12.2 ms, p50 9.4), and
  the Go binary alone is 16 ms. By the proxy line the daemon logs in `hooks.log` (the measure the line was written for) it holds: **7 ms p50**, n=274 Bash
  Pre calls since 05:00 today, 6 ms for the 77 since 06:00 (p95 152 to 232 ms and a worst 2,848 ms, from the heavy runs on this machine in the same hours).
- Test-socket and scratch numbers against these: the replay's scratch gives Pre Bash p50 33.9 ms (a 700-file project with 12 heads and 7 worktrees
 ), the kit's install 28.9 ms; the unit tests' socket number (W8.2) is 0.5 ms for the daemon alone, which is not what a
  hook waits.

## Findings for the lead

1. **The release gate is red on the branch's tip.** `test/repo-lint.test.mts` "no file names a person" fails on
   `docs/workorders/typescript/agents/kwb216-report.md:17` (a home path in the report). `release` stops at its gate on it
   (`release-run1/`, `release-run2/` logs); the 2.0.0 release would be refused the same way. The measurement set the path aside in its scratch
   clone only (scripts/measure-release.mts). Unfixed here (the report is another agent's file).
2. A changed installed file needs `node scripts/noop-pin.mts` as well as `counts.mts` (the noop test), or the gate is red
   ("full-stack: an update keeps an existing project's own layout... `.claude/hooks/no-find.mjs: changed`"). The measurement now does it as a developer would.
3. `scripts/measure-release.mts` had a stale known red (doctor-cache's assertion, fixed on the branch); it threw instead of continuing. Fixed.
4. `probes/baseline.mjs` (h) and (k) could not run unchanged: (h) assumed the Bash entry was `run-hooks.mjs`; (k) parsed npm's output with the prepare
   script's lines in it. Both fixed in the probe; W0's numbers were taken by the old form.
5. With a `node` shim first on PATH the Go client's daemon path is bypassed (69 of 69 events by the TypeScript runner). Not investigated further here;
   it may be only the shim, or a check that the node on PATH is the one the daemon was started with.

## Targets missed or worse than W0, in one list

Row (c) 19.0 to 59.6 s; (e) cold init+doctor 34.0 to 39.7 s; (l) doctor --fresh 29.8 to 38.5 s; (h) the runner alone 90 to 123 ms; the prompt's
wait 47 to 77 ms; live Bash wall 28.9 ms against W8's 20 ms; the status line render 26.6 ms against 15 ms; npm pack 0.84 to 6.95 MB; the daemon's RSS
at 8 workers 180 MB by `ps` against 150; the runner alone gives no gain on a feature task (2,587 against 2,662 ms); row (a) is the lead's.
