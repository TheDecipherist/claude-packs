# What the installed kit costs a project at run time

Survey, read-only. Project measured: ~/projects/bandwarp (kit 1.9.0, packs base, cpp, audio-core,
instrument-shell, midi, sound-design). Date 2026-11-11. The machine is a Mac under load (uptime load averages 5.6 to 9.7 while
measuring; seven agents running in bandwarp). The requirement measured against: every check the kit makes has the same time
constraint, so nothing a tool call waits on waits long. Doctor's own line today is a median of 500 ms per hook
(lib/hook-timing.mjs, SLOW_MS).

Sources, tagged [..]:
- [settings] bandwarp/.claude/settings.json (hook entries, timeouts, statusLine)
- [log] bandwarp/.claude/hooks.log plus logs/hooks-20261111-054903.log, -061614, -062928, -075710 (the rotated ones): 89,746
  timing lines from 04:48Z to 09:01Z (4 h 13 min; 183 minutes with at least one call). Format from
  packs/base/hooks/lib/hook-log.mjs: `time, event, hook, ms, exit, tool`. The log was still growing while I read it; two
  snapshots differ by about 1 percent, and the table uses one snapshot throughout.
- [code] the kit's packs/ and lib/ sources, read.
- [time] a command I timed on this Mac during the survey (one per number, repeated three times).

## 1. What runs per tool call

Every settings entry is one `node` process. All entries are `node .claude/hooks/run-hooks.mjs <hooks...>` (one process runs
its hooks in turn) except heartbeat, which is its own async process. [settings]

| Event | Matcher | Process | Hooks it runs | Timeout s |
|---|---|---|---|---|
| PreToolUse | (all) | heartbeat.mjs, async | heartbeat | 5 |
| PreToolUse | Write, Edit, MultiEdit, NotebookEdit, Bash | run-hooks (group A, 19 hooks) | inside-the-project, lesson-checks, file-size-guard, frozen-files, placement-law, protect-vendor, spec-lock, chart-first, folder-law, shape-law, brief-guard, once-only, secrets-guard, untrusted-boundary, realtime-guard, settings-layer, dispatch-once, template-law, code-shape | 60 |
| PreToolUse | Agent, Task | run-hooks | brief-guard, agents-held | 20 |
| PreToolUse | Bash | run-hooks (group B, 9 hooks) | stage-guard, git-guard, kit-fresh, build-guard, suite-once, no-find, repo-litter, look-gate, compile-cache | 60 |
| PreToolUse | Read, Bash | run-hooks | skill-first | 10 |
| PreToolUse | * | run-hooks | time-guard | 15 |
| PostToolUse | (all) | heartbeat.mjs, async | heartbeat | 5 |
| PostToolUse | Bash | run-hooks | look-gate | 20 |
| PostToolUse | * | run-hooks | time-guard | 15 |
| PostToolUse | Write, Edit, MultiEdit, NotebookEdit, Bash | run-hooks | param-id-lock | 20 |
| UserPromptSubmit | (all) | run-hooks | making, reuse-hint | 20 |
| Stop | (all) | run-hooks | making-check, git-guard | 60 |
| SessionStart | (all) | run-hooks | kit-fresh | 30 |

No SubagentStop entry is installed. A user-level hook outside the kit (`$HOME/.claude/hooks/shell-traps.mjs`) also runs on
Bash: one more start, not counted below.

Node processes started per event, counted from the table and confirmed by the log (runner lines per Bash call: Pre
8,171 / 2,046 calls = 4.0, Post 5,925 / 1,975 = 3.0 [log]):

| Call | Pre: blocking runners + heartbeat | Post: blocking runners + heartbeat | Node processes | Hooks run |
|---|---|---|---|---|
| Bash | 4 + 1 | 3 + 1 | 9 (7 blocking, 2 async) | 19 + 9 + 1 + 1 pre, 3 post = 33 |
| Write or Edit | 2 + 1 | 2 + 1 | 6 (4 blocking, 2 async) | 19 + 1 pre, 2 post = 22 |
| Read | 2 + 1 | 1 + 1 | 5 (3 blocking, 2 async) | 2 pre, 1 post = 3 |
| Agent | 3 + 1 | 1 + 1 | 6 | brief-guard, agents-held, time-guard + time-guard |
| a prompt | 1 | none | 1 | making, reuse-hint |
| Stop | 1 | none | 1 | making-check, git-guard |
| session start | 1 | none | 1 | kit-fresh |

Over the logged 4 h 13 min: 15,462 runner starts and 3,608 heartbeat lines [log]; 2,435 tool calls (PreToolUse time-guard
lines). The log holds fewer heartbeat lines than the 2 per call expected (about 4,870), so heartbeat is under-logged or
sometimes killed at its 5 s timeout; the process count above is from settings, not from the log.

## 2. The timing log, whole

All numbers are from [log], milliseconds, over all 89,746 lines. `run-hooks` is the whole runner process, node start-up
included in the log's own words, so it contains the hooks it ran; it is not a hook beside them. Pooled across events and
tools, as doctor pools them.

Top ten by total time, `run-hooks` shown for reference:

| Hook | Calls | Median | p95 | Worst | Total ms | Share of all lines |
|---|---|---|---|---|---|---|
| run-hooks (the runner process) | 15,462 | 34 | 139 | 9,066 | 1,060,114 | 59.7 % |
| git-guard | 2,071 | 2 | 449 | 9,001 | 239,231 | 13.5 % |
| heartbeat | 3,608 | 26 | 35 | 232 | 95,472 | 5.4 % |
| time-guard | 4,747 | 4 | 54 | 2,118 | 77,045 | 4.3 % |
| look-gate | 3,981 | 2 | 6 | 2,213 | 64,342 | 3.6 % |
| chart-first | 2,268 | 1 | 85 | 1,357 | 32,403 | 1.8 % |
| suite-once | 2,024 | 10 | 22 | 61 | 23,558 | 1.3 % |
| once-only | 2,268 | 2 | 40 | 607 | 21,726 | 1.2 % |
| shape-law | 2,268 | 3 | 29 | 154 | 17,260 | 1.0 % |
| lesson-checks | 2,268 | 2 | 35 | 193 | 16,465 | 0.9 % |

The other 26 hooks are each under 1 percent (no-find 12,313 ms down to agents-held 26 ms). Every guard of group A has a median
of 1 to 4 ms. The cost is not in the laws.

Where the process time goes (runner, hooks and heartbeat only; the runner line contains the hooks, so subtract):

| Part | Total ms | Share of node-process time | Per call |
|---|---|---|---|
| hooks inside the runners (all except heartbeat) | 619,431 | 53.6 % | median 1 to 10 ms each |
| runner itself (process minus its hooks: node start-up logged, imports, event log write) | 440,683 | 38.1 % | median 28 ms, p95 54 ms, per runner start (sequential attribution, 15,259 runs) |
| heartbeat | 95,472 | 8.3 % | median 26 ms |

So 46 percent of the logged time is not a check at all: it is starting a process to run one. And that is the logged part:
performance.now() starts after node's bootstrap, and a single runner running one 3 ms hook (skill-first) took 65, 91 and
109 ms wall in the kit's own install against 22 ms in the log for the same hook [time]. About 45 to 85 ms per process is
never in the log.

Outliers dominate the hook share: 221,197 ms (35 percent of all hook time) is in single hook calls over 1 s, 91 calls in
all. The biggest are git-guard at Stop (see 4).

Rate: busiest minute 06:16Z with 72 tool calls (445 runner starts, about 600 with heartbeat), then 06:00Z 66 calls and
08:56Z 61 calls; busiest second 24 runner starts (06:00:39Z) [log]. Mean over the 183 active minutes: 13.4 tool calls and 81
runner starts per minute. Nearly all 4 h 13 min of the run was seven agents plus the lead.

Doctor's own report on the same data hides the worst case: its line reads `git-guard 3/8478 (median/worst)` and passes,
because lib/hook-timing.mjs pools a hook's last 100 calls across events and tools, so the Stop call (median 1,734 ms below)
is drowned by Bash calls (median 2 ms) [code, bandwarp/build/logs/kit-update-mac5c.txt].

## 3. One call end to end, against the 500 ms line

Sum of the per-event medians of every hook that runs on that tool [log, by event and tool]. Hooks columns are the kit's
checks; runner columns are the processes.

Bash, the common call (hook medians, ms):

| Part | Hooks | Sum of medians |
|---|---|---|
| Pre group A (19) | brief 1, chart-first 1, code-shape 1, dispatch-once 2, file-size 1, folder-law 1, frozen 1, inside-the-project 4, lesson-checks 2, once-only 2, placement 1, protect-vendor 1, realtime 1, secrets 1, settings-layer 1, shape-law 3, spec-lock 1, template-law 1, untrusted 1 | 27 |
| Pre group B (9) | stage-guard 2, git-guard 2, kit-fresh 1, build-guard 1, suite-once 10, no-find 5, repo-litter 1, look-gate 1, compile-cache 1 | 24 |
| Pre skill-first, time-guard | 3, 4 | 7 |
| Post | look-gate 3, time-guard 4, param-id-lock 4 | 11 |
| Hooks in total | | 69 |
| Runner processes, logged | 7 blocking x 28 ms | 196 |
| Runner processes, node start-up not in the log | 7 x 45 to 85 ms [time] | 315 to 595 |
| Heartbeat, async | 2 x 26 ms | 52 (not waited on) |

Cost if the seven runners run one after another: 69 + 196 + 315..595 = 580 to 860 ms; with the 140 ms per node start
measured in the project: 7 x 140 + 69 = about 1,050 ms. If Claude Code runs the hooks of one event at the same time (its
documented behaviour; not measured here), the wait is the slowest runner per event, about 55 + 35 ms logged plus one boot,
but the processes still burn the same CPU, and with seven agents on one machine the CPU is shared: busiest second was 24
runner starts. Either way no single hook is near the 500 ms line; the chain of processes is.

Write (hook medians, ms): Pre group A 212 (chart-first 93, once-only 36, lesson-checks 26, template-law 19, shape-law 13,
the other 14 hooks 25) + time-guard 4; Post time-guard 5 + param-id-lock 3. Hooks 224. Runners: 4 blocking, logged 4 x 28 =
112, unlogged 180 to 340 [log, time]. Total 516 to 676 ms sequential. Over 500 ms: yes at the top of the range; the 93 ms
chart-first alone is 18 percent of the line. Edit: chart-first 23, once-only 27, lesson-checks 22.5, shape-law 19,
template-law 10 (hook medians over 148 calls) [log].

Stop (one process): making-check 20 + git-guard 1,734 = 1,754 ms of hooks; the runner line itself reads median 1,880, p95
7,785, worst 9,066 over 47 calls [log]. This is 3.8 times the 500 ms line at the median, and 15 times at p95. 30 of the 51
Stops were over 1 s. It is the single event over the line.

UserPromptSubmit: making 7 + reuse-hint 16, runner median 49 ms, p95 84 [log]. Fine.

## 4. The heavy ones (median over 50 ms, by event and tool)

Only two hook medians are over 50 ms in their own event: git-guard at Stop and chart-first on Write. The runner process is
over 50 ms for Edit pre (53.5 ms, mostly its hooks: 148 calls each of chart-first 23, once-only 27, lesson-checks 22.5, shape-law 19).
Also read, for their tails: once-only, look-gate, time-guard.

| Hook, event | Median / p95 / worst | What it spends on | Per call, or cacheable |
|---|---|---|---|
| git-guard, Stop | 1,734 / 7,746 / 9,001 (47 calls; 51 in the later snapshot: 122,475 ms, 20 % of all hook time) | packs/base/hooks/lib/pushed.mjs `stopVerdict`: `localBranches` (git calls over every local branch: rev-parse, config, cat-file, log), then `trunkLag` (lib/trunk-lag.mjs: worktree list, status, ls-remote, rev-list, merge-base). The remote heads come from `git ls-remote --heads` over the network. The cache (claude-packs-heads.json in the git dir) only clears a branch the cache already shows pushed: "Anything it would refuse is looked up again live first", so a project with unpushed branches, the normal state with seven agents, pays the live look every Stop. The code header measures it: cache clears 0.3 s, live look 4 to 7 s at load 27. | Per call, but cacheable. Key: remote URL + the sorted list of local branch tips (read from refs and packed-refs, no process). A negative answer valid 60 s; invalidated by any local ref change or a `git push` the Bash hook saw. Also a deadline: past 1 s the existing "GitHub was not checked" note (already in the code for an unreachable remote) is used and a detached refresh warms the cache for the next Stop. |
| chart-first, Write | 93 / 596 / 1,357 (96 calls); Edit 23 (148); Bash 1 | synth-creator/hooks/chart-first.mjs `committed()`: `git ls-tree -r -l HEAD` over the whole tree of the checkout, then glob match. One git process, 29 to 45 ms in bandwarp [time], more when the tree is large or the disk busy. | Per call, cacheable per commit. Key: the checkout path + HEAD commit sha (read from `.git/HEAD` and the ref file, no process) + the chart globs from layout.json. A committed chart stays committed until HEAD moves. Saves about 90 ms per Write and 20 per Edit. |
| once-only, Write / Edit | 36 / 270 / 607 (Write); 27 (Edit); 2 (Bash) | lib/dup-index.mjs: reads its index from disk, re-reads files whose mtime changed, compares the added lines with the repo through the index, then jscpd on the candidates (found by findJscpd). Not a whole-repo scan: the header says KWB-24 replaced that. | Per call, index already incremental. Key for more: sha1 of the added lines (a repeat write of the same text is judged once) plus the index generation. The p95 of 270 ms is a cold index or jscpd; the cure is the index staying warm (below). |
| lesson-checks, Write / Edit | 26 / 39 (Write); 22.5 (Edit); 2 (Bash) | `readdirSync(.claude/checks)` and `JSON.parse` of every check file, twice per file (lines 56 and 61 of lesson-checks.mjs: once to filter by `appliesTo`, once to build); then each check's regex on the written text. | Per call, cacheable per install. Key: the lock hash (claude-packs.lock.json) = the checks folder's content. Precompiled at update. Estimate 15 ms saved (not measured). |
| shape-law, template-law, Write / Edit | 13 to 19 (shape-law), 10 to 19 (template-law) | read design/shape.json, code-shapes, a repeated-code scan of the written text. | Per call; cache key design/shape.json hash. Small. |
| look-gate, Post Bash | 3 / 167 / 2,213; 156 of 2,037 calls over 100 ms | git (`execFileSync('git', ['-C', root, ...])`, packs/base/hooks/look-gate.mjs line 33) when a command touches a look's code, reading each look report; 7 percent of calls pay it. | Per call, cacheable. Key: HEAD sha + the hash of the look's code globs. |
| time-guard, Post | 4 / 54 / 2,118; Write 5 median, 504 p95 | synth-creator/hooks/time-guard.mjs: once a minute at most it runs `ps` (lib/own-processes.mjs, `ps -axo`, 42 ms here [time]) and scans worktrees (readdirSync, statSync of each .git); the call that pays it waits. | Per minute, not per call: but the call that finds the minute stale pays. Do it detached (as the status line does) and read the result file. |
| heartbeat | 26 / 35 / 232 | a whole node start to write one small JSON file into the main checkout's logs/heartbeats | Not a check: a write. Inside the runner it costs a file write (about 1 ms). |
| suite-once, Pre Bash | 10 / 22 / 61 | `git status --porcelain` on commands that look like a test run | Cache by HEAD + index mtime. Small. |

None of these reads a transcript or the whole repo per call. reuse-hint (prompt, 16 ms median) uses lib/repo-index.mjs; the
making-check at Stop (20 ms, p95 90) reads the turn's transcript and runs two git processes (`ls-files`, `diff`), as its code
says.

## 5. Process starts, today and with one runner per event

Per Bash call today: 9 node starts (7 blocking, 2 async), measured by settings and confirmed by the log (4.0 + 3.0 runners
per call). Per Write: 6. Per Read: 5.

With one runner per event (one node process runs every hook of that event in order, heartbeat inside it as a file write):

| Call | Today | One runner per event | Starts saved |
|---|---|---|---|
| Bash | 9 | 2 (Pre, Post) | 7 |
| Write or Edit | 6 | 2 | 4 |
| Read | 5 | 2 | 3 |
| Agent | 6 | 2 | 4 |

Over the logged run: today about 15,462 runner + about 4,870 heartbeat starts (2 per call, the log held 3,608) =
20,300; with the change 2,435 x 2 + 134 prompts + 47 Stops + 389 SessionStart = about 5,450. Saved: about 14,850 starts.
Time saved per Bash call, from the measurements:

- Blocking: 5 fewer runner starts. Process boot, not logged, 45 to 85 ms measured per start in the kit's install [time]:
  225 to 425 ms. With the 140 ms per start measured in the project: 700 ms.
- Runner start-up that is logged (28 ms median: the imports of lib files each process reads again): 5 x 28 = 140 ms.
- Together, per Bash call: 365 to 565 ms at 45 to 85 ms per start; 840 ms at 140 ms per start.
- Async: 2 heartbeat starts of 26 ms logged (about 80 to 140 ms each with boot) leave the machine's CPU: 160 to 280 ms of
  CPU per call, not waited on, but 24 runner starts a second is where seven agents contend.
- Over the logged run: 14,850 starts x 65 ms = 965 s of CPU (16 minutes); at 140 ms 2,080 s (35 minutes).

What one runner per event does not fix: the Stop git-guard (1,734 ms) and the long tails (chart-first on Write). Those
are work, not starts.

A slow hook then holds the ones after it; crash policy stays per hook (lib/crash-policy.mjs) and mergeOut already merges outputs.

## 6. Doctor's cost in a project

Checks doctor runs (lib/doctor.mjs), in order:

1. configuration and packs installed (configProblems), pack manifests (manifestProblems per pack)
2. rule paths against layout.json (applyPaths, checkOnly), layout folders exist
3. settings register the hooks
4. lesson-checks selftest (always run, one `execFileSync` node process, not cached)
5. the selftest of every hook: `readdirSync(.claude/hooks)`, each `.mjs` or `.py` with `--selftest` spawned as its own
   process, SELFTEST_JOBS at a time with SELFTEST_S seconds each. bandwarp has 36 hook files that carry a selftest (the kit
   has 46); each is a node start plus its own scratch project, some with git repos and worktrees
6. symmetry (symmetryProblems), skills over 8,000 characters and description form, every rule's pack files
7. hook proofs (hookProofProblems, lib/hook-proof.mjs: a guard that fails open), statusProblems, buildQueueProblems
8. page gate, hover gate, token, shape (shapeProblems) problems
9. once-only's duplicate count (onceOnlyDoctor: jscpd over the 270 sources; 109 to 181 ms in the logs), making's token cost
10. hook timing (timingProblems: last 100 calls per hook, 500 ms median is red)
11. coverage (every source file against every rule), ruleTestProblems, edited-file notes
Measured: the update logs carry no timing line, so the time is from file times (backup folder creation, the first thing
`update` makes, to the log's last write; this leaves out work before the backup) [bandwarp/build/logs/kit-update-mac5b.txt,
kit-update-mac5c.txt, and .claude/.claude-packs-backup/ times]:

| Update | Start (backup folder) | End (log) | Wall | Selftests |
|---|---|---|---|---|
| mac5b | 02:57:23.167 | 02:57:43.964 | 20.8 s | 35 of 36 unchanged, not run again |
| mac5c | 03:32:49.149 | 03:33:18.975 | 29.8 s | no "unchanged" line: all 36 run |

The difference, 9.0 s, is the cost of the 35 selftests the cache saved (about 0.26 s each, run 6 at a time); the 20.8 s that
remains with nearly all of them cached is the update's copy and the other doctor checks, never the selftests. What
dominated the cached 20.8 s was not logged; candidates by code: the copy of 394 managed files and 91 rule paths, coverage
over every source and rule, and 36 hook files hashed (`selftestKey`: the hook plus every file of hooks/lib, the runner, node
version, guards). The kit's own comment gives the other end: 166 s for a fresh install on the Mac before the gate mode
(lib/doctor.mjs, KWB-166), and 7.4 s on a quiet Linux box (lib/selftest-cache.mjs).

The selftest cache that exists already crosses projects: lib/selftest-cache.mjs keeps empty files in
`$TMPDIR/claude-packs-selftests` (975 files today). Its key is the hook, all of hooks/lib, the runner, node, platform, jscpd
and the project's guards. Weaknesses read from the code: any one-line change to any lib file reruns all 36 to 46 selftests;
it is in the system temp folder (macOS clears it); and the project's `guards` object is in the key, so two projects with
different guards never share a proof. bandwarp's update ran all selftests after a lib change at 29.8 s.

## 7. The status line

[settings] bandwarp: `node "$CLAUDE_PROJECT_DIR/.claude/tools/statusline.mjs"`, refreshInterval 1. [code] packs/base/tools.
Per render (every second, one node process):

- 1 node start: 50 to 65 ms bare, 60 ms at node -e '' under this load [time]; 140 ms measured in the project.
- reads: stdin, the user settings.json (model), the transcript tail (256 KB), the RUNS cache file, the kit version.
- git: `gitState` is cached 30 s and keyed on the mtimes of index, HEAD, FETCH_HEAD and logs/HEAD; when one changes, or after
  30 s, it runs one `git status --porcelain=v2 --branch --untracked-files=normal` (30 to 48 ms here [time]). Idle: 2 per
  minute. While agents commit or stage in the main checkout the stamp changes and it is up to 1 per second.
- no ps and no lsof per render.

Every 30 s (TTL_MS, a lock of 25 s), the render starts a detached node (`--refresh`) that runs `runsReport()`:
`ps -eo pid,pcpu,rss,args` (41 to 43 ms [time]), `lsof -d cwd` over every process (125 to 134 ms [time]), `git worktree list`
per project, per agent `git rev-list --count` and `git merge-base --is-ancestor`, plus ssh for any listed remote. Measured:
runsReport() with no run found, 348 ms wall twice [time, kit repo]. In bandwarp with 7 agents it is larger (not run
there: it was not allowed). Called detached, nothing waits on it.

Cost per minute: 60 render starts x 60 to 140 ms = 3.6 to 8.4 s of CPU (6 to 14 percent of one core); git 2 to 60 x 30 to 48
ms = 0.06 to 2.9 s; refresh 2 x (about 350 ms and up) = 0.7 s and up. Total about 4.4 to 12 s CPU a minute for a bar that
only moves; at most one start per second, never blocking a tool call. On the Mac this is the largest steady cost the kit has,
before a single tool call: 3,600 node starts an hour against about 600 tool calls an hour (2,435 calls in 4.2 h).

## 8. Budget proposal

Principle: a tool call waits on at most one process per event, and that process holds a time budget for the whole chain, not
a median per hook that hides the tail. Budgets are on what the call waits, p50 / p95, in ms, measured by the same log with
the runner's whole-event line (the log gains one `event` line per runner: it already has `run-hooks`).
Per event, whole chain (runner process included):

| Event | Today p50 / p95 [log] | Budget p50 / p95 | Hard stop |
|---|---|---|---|
| PreToolUse Bash | about 250 logged, 580 to 860 with boots, 7 blocking starts | 100 / 250 | 1,000 (a hook past it is cut, says so, and lets the call go) |
| PreToolUse Write or Edit | about 330 logged, up to 676 | 120 / 300 | 1,000 |
| PostToolUse (any) | about 90 with 3 starts | 60 / 150 | 500 |
| UserPromptSubmit | 49 / 84 (1 start) | 80 / 150 | 500 |
| SessionStart | about 40 (kit-fresh 1) | 150 / 300 | 1,000 |
| Stop | 1,880 / 7,785 | 200 / 1,000 | 2,000 |
| Statusline render | one 60 to 140 ms start a second | 80 per render | 250 |
| Doctor in a project, cached | 20.8 s | 10 s | 30 s |
| Doctor, nothing cached | 29.8 s | 40 s | 120 s |

Per hook (inside the runner): p50 10 ms, p95 50 ms, worst 200 ms. A hook that needs more makes its work a cache keyed as
below, or a detached refresh that writes a file the hook reads. Doctor holds this per hook per event, not pooled: today the
line is 500 ms over the last 100 pooled calls, which passes git-guard at 3 ms median while its Stop median is 1,734.
Hooks over p95 50 today: git-guard (Bash p95 51, Stop 7,746), chart-first (Write 596), once-only (Write 270), look-gate
(Post 167), time-guard (Post 120; Write 504).
What meets the budgets, with the saving from section 2 to 7:

| # | Change | What it saves, from the measurements |
|---|---|---|
| 1 | One runner per event in settings (a single entry per event; the matcher decided inside the runner from a table the install writes), heartbeat inside it as a file write | Bash: 9 to 2 starts, 365 to 565 ms per call (840 ms at 140 ms a start); Write 6 to 2, 4 blocking runners to 2, 150 to 280 ms; about 14,850 starts, 16 to 35 minutes of CPU over the logged 4 h 13 min. Gets Bash to about 70 (hooks) + 2 x 28 + 2 boots = 185 to 295 ms sequential; with one batched pre stage about 100 to 150. |
| 2 | git-guard at Stop: serve the cached verdict (key: remote URL + sorted local branch tips; 60 s; invalidated by a ref change), cap the live look at 1 s with the existing "not checked" note, warm the cache with a detached refresh at SessionStart and after each push or commit | Stop median 1,880 to about 100 to 200 ms: 1.7 s per Stop; 7.8 s p95 gone; 30 of 51 Stops were over 1 s; 122 s of the logged 626 s of hook time. |
| 3 | A per-session state file of git facts: HEAD sha, branch, merge state, dirty list, keyed by the mtimes the status line already uses (index, HEAD, FETCH_HEAD, logs/HEAD), written by the runner once per event and read by chart-first (ls-tree), look-gate, suite-once, stage-guard, git-guard, repo-litter | chart-first Write 93 to about 3 ms; Edit 23 to 3; look-gate Post tail 167 p95 and 2,213 worst; git-guard Bash tail (98 of 2,105 calls over 100 ms; p95 51); suite-once 10 to 2. About 90 ms per Write, 20 per Edit, 7 percent of Bash calls 100+ ms. |
| 4 | The repo index (lib/dup-index.mjs, repo-index.mjs) loaded once per runner process and kept as one file per checkout keyed by HEAD sha + dirty mtimes; with one runner the libs also stop loading 5 more times | once-only Write 36 to about 10 p50, 270 to 50 p95 (not measured: estimate); runner overhead 28 ms median counted in 1. |
| 5 | lesson-checks compiled at update into one file keyed by the lock hash | about 15 ms on every Write and Edit (estimate from reading the code: two JSON.parse per check file per call; not measured). |
| 6 | time-guard's ps scan and worktree scan detached, result read from a file | its Post p95 120 ms and Write p95 504 ms, worst 2,118 ms leave the call. |
| 7 | Heartbeat as a file write in the runner (part of 1) | 26 ms process per call and a start per call gone; 95 s of CPU over the log. |
| 8 | Doctor: hash each selftest on its own file and the lib files it imports (not all of hooks/lib), keep the store in `~/.cache/claude-packs` (not the temp folder), and keep guards out of the key unless the hook reads them | A one-line lib edit reruns the hooks that import it, not all 36 to 46: at 0.26 s each the full rerun is 9 s of a 29.8 s update; the cache across projects already exists, this widens its hits. Also give `update` a timing line in its log, so the dominant 20 s is seen. |
| 9 | Status line: render stays one process; refreshInterval 5 instead of 1 (an option: the bar moves every 5 s), or the same file served by the runner's state | 48 fewer starts a minute: 2.9 to 6.7 s of CPU a minute (60 to 140 ms each). |

Order by the size of the saving: 1 (the process count, every call), 2 (the only event over the line), 3, 9, 6, 8, 4, 5.
After 1 and 2 the Bash call is about 100 to 150 ms with 2 starts, Write about 150 to 250 ms, Stop under 200 ms, and no hook
is over the 500 ms line. Items 4, 5 and the 90 ms figure for the tails of 3 are estimates from the code, not measurements.
Not measured: Claude Code's own parallelism between hook entries of one event; bandwarp's runsReport with seven
agents; what in the 20.8 s cached update dominated; the user-level hook (shell-traps) outside the kit.
