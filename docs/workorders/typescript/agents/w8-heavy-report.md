# W8 item 3: the heavy hooks

Branch `work/2.0.0-ts-w8-heavy` (from `work/2.0.0-typescript`), worktree `.claude/worktrees/w8-heavy`, every commit pushed. Status: DONE_WITH_CONCERNS (see the end).

## Measured

Probe: `docs/workorders/typescript/probes/replay-play.mts` (new; the fixture holds timings, not payloads, so each event becomes a payload of its kind and is run through the install's own settings entry, the `sh` picker, in a scratch install of bandwarp's pack set: `synth-creator cpp audio-core instrument-shell midi sound-design`; nothing is written into bandwarp). Scratch repo: bare remote, 12 heads, 7 agent worktrees, 3 local branches holding commits GitHub lacks. The remote answers after 1.5 s (a `git-upload-pack` shim in a `GIT_EXEC_PATH` folder; W0 measured 4 to 7 s at load 27, so this is mild). All 51 Stops of the fixture are played, other events every 20th. Before every 5th Stop a commit and its push land, each shown to the hooks first (as Claude Code does), so a ref changes under the kept look. Runs: `build/evidence/W8/replay-{before-ts,after-ts,after-proxy}.md` (ignored by git; the numbers are copied here).

| event wall, ms | before p50 / p95 / worst (TS runner) | after p50 / p95 / worst (TS runner) | after (proxy and daemon) |
|---|---|---|---|
| Stop (51) | 2,122 / 2,229 / 2,311 | **64 / 90 / 1,297** | **64 / 87 / 1,306** |
| Pre Write (11) | 107 / 117 / 117 | 111 / 126 / 126 | 55 / 67 / 67 |
| Pre Edit (6) | 114 / 134 / 134 | 117 / 126 / 126 | 54 / 60 / 60 |
| Pre Bash (116) | 33 / 57 / 64 | 33 / 44 / 54 | 33 / 39 / 41 |
| Post Bash (96) | 31 / 45 / 89 | 33 / 43 / 47 | 33 / 42 / 82 |

Stop p50 under 200 and p95 under 1,000: met (64 and 90 through the TypeScript runner, 64 and 87 through the daemon). The one Stop over 1 s is the first, cold one: nothing kept yet, GitHub given its one second, the "not checked" note said, the refresh started.

Each hook's own `ms` (p50 / p95 / worst; the p50 is 0 for most because most events do not reach a hook's work):

| hook, event | before | after |
|---|---|---|
| git-guard, Stop | 2,091 / 2,198 / 2,262 | 6 / 10 / 1,233 (daemon: 6 / 8 / 1,233) |
| chart-first, Pre | 0 / 78 / 102 | 0 / 5 / 8 |
| lesson-checks, Pre | 0 / 12 / 19 | 0 / 7 / 13 |
| time-guard, Pre | 1 / 3 / 5 | 1 / 3 / 4 |
| git-guard, Pre | 0 / 22 / 31 | 0 / 22 / 31 (the commit payload's own live look: unchanged) |
| once-only, Pre | 0 / 23 / 26 | 0 / 21 / 29 (not in this item) |

Not moved by this item and seen in the same table: `param-id-lock` Post (p95 68 to 71), `once-only-index` Post (p95 17), `reuse-hint` at UserPromptSubmit (p95 about 135). time-guard's gain is on the paths the replay payloads rarely hit (the minute's `ps` and per-worktree git), shown by the selftest plant, not by this table. The "before" Stop and the other "before" rows were taken with the probe before it paced Stops and showed commits to the hooks; that changes nothing for the old code (it kept nothing).

## Each hook

1. **git-guard at Stop** (`lib/stop-cache.mts`, `stop-look.mts`, `git-files.mts`, `stop-verdict.mts`; `git-guard.mts`). The look (branches GitHub lacks, the main checkout's trunk against GitHub's) is kept in the git dir (`claude-packs-stop.json`) under a key made with no process: every loose and packed ref under `refs/heads` and `refs/remotes`, each worktree's HEAD, and the config (remote URLs), plus the guards' own settings. Served 60 s (`guards.git.stopCacheMs`, 0 looks every time). The key is taken before the look, so a ref that moves during a look makes the next Stop look again. The live look is capped at 1 s (`guards.git.stopLiveMs`) through a deadline into `remoteHeads` (`until`); past it the existing "GitHub was not checked at the end of this session" note is said (exit 0) and `git-guard --refresh-stop` starts detached and keeps the full look. A commit the hook lets through starts the same refresh, which waits for the ref to move; a push drops what was kept (a push by URL moves no local ref) and starts a forced refresh. Not kept: a look that did not reach GitHub, and a trunk lag (whether the main checkout may be touched depends on uncommitted work, which no ref shows).
   - Plant, seen red (selftest `kept Stop look`, `lib/stop-cache-selftest.mts`): the key without the refs, so a cached Stop misses a new unpushed commit: 6 reds, among them "a new commit changes a ref: the kept look is not served" (got 0, wanted 2). The cap raised to 15 s: "GitHub answers in 3 s: Stop goes ahead with the note" and "within about a second" red. The refresh not started: "the detached refresh took the look" and "the next Stop is answered from it, whole" red. Also the cases that prove the cache is read (GitHub out of reach, no ref changed, no note), the refresh warms the next Stop (a slow GitHub, 3 s), and a push the hook saw drops the kept look.
   - Worktree case: unchanged (`git-guard` already had one); selftest green: 18 token, 44 house, 32 pass, 25 pushed-law, 9 owner-push, 9 trunk-law, 14 kept-look, 4 write-trap cases.
2. **The git state** (`lib/git-state.mts`; `run-hooks.mts` flag `--git-state`, `resident/event.mts`, `resident.mts`). After each event the runner (TypeScript runner and daemon alike) asks `noteEventGitState`: when what is kept for the project's checkout and the event's checkout no longer matches the repo, a detached `run-hooks --git-state <checkout>` takes HEAD's non-empty files (sizes) and the tracked dirty list and writes `claude-packs-gitstate-<hash>.json` in the event's TMPDIR by rename. Hooks only read it and ask git for themselves when it is missing or stale, so a hook run alone judges as before. Validity: the tree by HEAD's commit read from the git dir's files (exact); the dirty list by the status line's mtimes (index, HEAD, FETCH_HEAD, logs/HEAD) and 30 s. Read by: `chart-first` (`headFiles`: Pre Write p95 78 to 5 ms), `suite-once` (`dirtyFiles`, a message only), `look-gate` (branch and `origin/<trunk>` from the files), `git-guard`'s `branch` and `hasHead` (from the files, git for a folder that is not a checkout's own).
   - Tests: `test/unit/hooks-lib/git-state.test.mts` (6: files read in a worktree, packed refs, fingerprint moves for commit/remote ref/worktree/URL, kept list read while HEAD is the commit and not after, dirty list fresh/stale/index moved, one detached refresh), `test/integration/git-state-runner.test.mts` (an event through the runner writes the facts, detached, and starts no second). Red seen: `headFiles` made to ignore the kept list reds the "kept list answers" test. chart-first's selftest gained the plant (a kept list naming a chart git does not hold is the one read; a list taken at another commit is not): 12 cases green (needs an installed copy).
3. **time-guard** (`lib/time-look.mts`; `time-guard.mts`). The minute's `ps` look and each agent's per-worktree `git status` and `git log` run in `time-guard --look <json>`, detached; the call answers at once, and the next event reads `look.json` and says the finding (the same sayOnce rule). A look of one agent keeps what another's found (times, not minutes). The worktree scan was already detached. A selftest that hands its own table still looks at once.
   - Plant, seen red: the look taken inside the call, with a `ps` that sleeps 0.6 s on PATH: "does not wait for the ps and the git calls of the look (got 763 ms, wanted quick)". Cases: a stale-minute call says nothing and returns under 300 ms; the look lands in `look.json`; a planted finding is said by the next event and once. 59 cases green.
4. **lesson-checks** (`lib/checks-compiled.mts`; `lesson-checks.mts`, `lib/sync.mts`). `update` and `init` write `.claude/checks.compiled.json` after the lock: the parsed checks and a key. The key is the lock's hash plus name, size and mtime of every check file (the lock does not list a check the project added or edited, so the lock alone would be a silent law-off). The hook reads it when the key is the folder's now; a stale or missing one is never trusted and never written by the hook (it reads the files as before). A check file that is not JSON is not compiled and the hook still names it. Pre Edit/Write p95 12 to 7 ms; the survey's 22 to 39 ms was on a larger set of checks.
   - Tests: `test/unit/hooks-lib/checks-compiled.test.mts` (4): the compiled one is the one loaded (a doctored compiled file is seen), an added check, an edit and a new lock make it stale, a non-JSON file, no folder. Red seen: the key without the file stamps reds the staleness test.

## Decisions (recommended choice taken, nobody to ask)

- Kept git state per checkout, not per session: content-keyed (commit, stamp), so sharing it across sessions is safe.
- `stage-guard` makes no git call of its own (it calls `house` with a machine that has nothing in it), so nothing was converted there. `repo-litter`'s `git ls-files --others --modified -- <path>` needs live untracked files, which no stamp can key, and runs only on a `git add`: left as it is, stated here.
- `look-gate` still asks git for `diff`, `log`, `show`, `ls-tree` at a landing or after a build, and only in a project that declares looks (bandwarp declares one); those are commit-addressed and could be memoised by sha later.
- A positive Stop look (branches really unpushed) is kept too, since the normal state with seven agents is unpushed branches; staleness after a push is closed by `forget` on a push the hook saw, by a remote-ref move for a named remote, and by the 60 s bound for a push made outside the hook.
- Selftest rigs for the old Stop laws set `stopLiveMs: 20000` (the hub rig and the owner case), so a loaded gate waits for GitHub as the old Stop did; the kept-look selftest uses the default second for its cap cases.
- The daemon spawns the TypeScript runner's `--git-state` for the refresh rather than running git on its own thread.
- Probe: `--proxy` isolates the daemon, socket and binary in the scratch (`CLAUDE_PACKS_CACHE`) and ends the daemon by its command line if `daemon stop` does not find it (twice it did not: two scratch daemons from the first tries were ended by hand; none runs now).

## Gate

`npm run test:changed -- --base work/2.0.0-typescript` on the committed work: 32 selftests ok, 520 of 520 tests pass; `node scripts/counts.mts --check` green. Reds met on the way, all mine and fixed: the git-guard owner selftest under load (the 1 s cap against a loaded machine: now `stopLiveMs` in the rigs), `repo-lint` gate 4 (my `Look` interface duplicated a shared shape: renamed `MachineSnapshot`) and gates 11/12 (a `process.env` in chart-first's selftest body: moved to `lib/git-state-selftest.mts`, loaded by dynamic import). Four refusals marked right (`03ed3d8c`, `84c3aae5`, `9291bdd5`, `4fdd13a0`: a 338-column line, three helper names that already exist); `9ce14d3a` (a git-guard Stop refusal at 00:15) is not mine and is left open.

## Concerns

Tags: `[deferred]` was decided by the spec's own wording or by this report's recommended choice; `[gap]` is real and nobody has decided.

- [deferred: the spec's Done-when names p95 only] The cold first Stop of a session (and any Stop right after a ref change that the commit hook did not see, such as a commit made by a script outside Claude Code) pays the 1 s cap and says "not checked": the Stop's worst is 1.3 s, as the spec accepts for a p95-only target.
- [gap] The replay's remote lag is 1.5 s, not W0's 4 to 7 s, and Stops are 6 s apart rather than minutes; the refresh needs about 3 s here, so a real session gives it more time, a real GitHub needs it more.
- [gap] The daemon's Bash wall (33 ms) in the probe is the `sh -c` wall (shell, picker, client), not the `proxy` line's; W8.2's own measure of the 20 ms target is unchanged by this item.
- [gap] `types.d.mts` was not touched; it needs `guards.git.stopCacheMs` and `stopLiveMs` named (declared on `GitGuards` in `lib/remote-heads.mts`, proposed for it).
- [deferred: no daemon may outlive a test] Not tested through the daemon in a test (no daemon may outlive one): the daemon's refresh call is covered by the probe's `--proxy` run (Stop and Write walls above) and by the shared `noteEventGitState`.
