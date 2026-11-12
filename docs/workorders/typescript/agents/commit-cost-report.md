# commit-cost: report

Branch `work/2.0.0-ts-commit-cost` (pushed). Two parts: no git process on a commit, push or merge; and the first event after a daemon start.

## 1. git processes on the event

Method: a `git` first on PATH that logs its arguments (`build/cc/bin/git`, `build/cc/fire.sh`, scratch repos with a bare remote and 10 staged files, in `build/cc/`), the hook run as Claude Code runs it. Processes counted on the event, before and after:

| call | git-guard before | after | kit-fresh (kit repo) before | after |
|---|---|---|---|---|
| commit | 9 (`rev-parse HEAD`, `config branch.X.remote`, `config branch.X.merge`, `remote get-url` x2, `rev-parse --git-common-dir`, `ls-remote` once when no look is kept, `cat-file --batch-check`, `log --not`) | 0 | 3 (`rev-parse --abbrev-ref`, `for-each-ref --no-merged`, `rev-parse --verify origin/main`) | 0 (1 only on the first call after a ref moves) |
| push | 2 (`remote get-url`, `rev-parse --git-common-dir` from `pushSeen`) | 0 | 0 | 0 |
| merge | 0 | 0 | 0 | 0 |

Staged-file count (1, 10, 40) does not change the count: none of the hooks read the index. Wall time is not asserted (the machine ran at load 20 from other agents' gates); the process count is the test.

What changed:
- `lib/git-config.mts` (new): `gitConfigRead` reads remote URLs and branch upstreams from the repo's config, `~/.gitconfig` and the XDG config. It gives way to git (returns null) on any include, `insteadOf`, worktree config, unparsed header or value, `GIT_DIR`, `GIT_CONFIG*`. /etc/gitconfig is not read.
- `lib/git-files.mts`: `findGitDirs` (nearest `.git` upward; null when GIT_DIR/GIT_WORK_TREE are set).
- `remote-heads.mts`: `urlOf`, `target`, `cacheFile` use them (also `pushSeen`); `branches-ahead.mts`: `commonDir` and `unpushed` read HEAD from files, and when HEAD is a commit GitHub holds (the kept look or a tracking ref) there is nothing to subtract, so no `cat-file`/`log`. An unpushed commit still takes the old path and is refused (test).
- `git-guard.mts`: `remoteUrl` from the config.
- `lib/kit-fresh-refs.mts` (new) and `kit-fresh-look.mts`: branch and origin/main from files; the `for-each-ref --no-merged HEAD` walk is kept in the git dir under a key of every ref, worktree, config and HEAD's commit. A selftest-planted `git` function still bypasses it, so the existing selftests are unchanged.

Process left on the event, and why: the first look at GitHub in a repo with none kept (`ls-remote`, a network call) and the first `for-each-ref` after a ref moved. Both are once per change, not per call. After a push, `pushSeen` makes the next offline look live once; the detached refresh the hook starts after a push (already there) refreshes the kept look, so it is normally ready. Load 1 and load 10 for those two were not measured (load stayed near 20 for the whole session; the lead's soak was running).

Tests: `test/hooks/base/commit-cost.test.mts` (6 tests: zero processes for git-guard commit/push/merge, a local-only commit still refused, kit-fresh 1 then 0 then 1 after a commit, kit-fresh still refuses a commit lacking newer work from the kept list, `pushSeen` with no process, `gitConfigRead` incl. include/insteadOf fall back).
Red: `build/evidence/commit-cost/red1.txt` (old sources: 3 of 6 fail, the count tests); green: `green1.txt` (6 of 6).

## 2. First event after a daemon start

Measured (`build/cc/cold.mts`, a fresh js-ts install, fresh daemon): first event wall 575 ms, then 246, 305, 263 ms; hooks 22 ms summed on the first event, RSS 210 MB (d-31: 250). I could not reproduce 300 to 1,100 ms per hook in the hooks' own `ms`: the worker's import time is outside `ms` (worker.mts), so warming imports (more preloaded workers) would not move that number, and it would cost RSS. The cold ms in the live log is first-call state inside a hook (index and file reads) on a larger project, per worker.

Choice (recommended one, no one to ask): doctor judges warm calls only. The daemon writes one `daemon-start` line to hooks.log when it starts listening (`DAEMON_START` in `hook-log.mts`; `resident.mts`); `warmCalls` in `lib/hook-budget.mts` drops, after each start line, the first `COLD_HOOK_CALLS` = 4 calls of each hook (one per worker that may hold it, `SPREAD`, now exported from `resident/options.mts`) and the first `COLD_EVENT_CALLS` = 1 event per class and kind (proxy/event lines). A series still needs `MIN_CALLS` = 5 warm calls. A log with no start line (process-per-hook runner) has no cold calls. `hook-timing.mts` ignores the start line. The resident selftest's line count excludes it.
First event stays under a second in the rig (575 ms) before and after (the change does not touch it).

Tests: `test/unit/lib/hook-budget.test.mts` (+3), red `red2.txt` (2 fail without `warmCalls`), green `green2.txt`; `test/integration/daemon-start-line.test.mts` (a real daemon writes the line), `green3.txt`.

## Gate

The lead stopped my full picked gate (load 20) and asked for direct files only. Run through quiet-test, concurrency 2, output `build/commit-cost-gate.txt`: commit-cost, git-guard, kit-fresh (hook), kit-fresh-look, remote-heads, hook-log, hook-budget, daemon-start-line, resident: 66 tests, 66 pass. `npm run check` exits 0; `node scripts/counts.mts --check` green after regenerating `packs/manifest-2.0.0.json` (committed). The full picked gate is left to the lead's merge gate.

## Open
- doctor on the live install will go green on git-guard/kit-fresh only after the lead updates the kit's own install (new files, a restarted daemon writing the start line).
- Not measured at load 1 and 10 (see above). `reds` owns git-guard's "kept Stop look" case; untouched.
- Processes: no daemon or sampler of mine is left (checked with `ps`; the one `resident.mjs` running is the main project's own).
- No refusal judged wrong (one template-law hit on a staging copy of a file under build/, right; one git-guard refusal of `git checkout` on a dirty tree, right).

## Follow-up: the commit after `git commit && git push`, and the refresh children

Why the next event still paid (reproduced with `build/cc/seq.sh`: Pre event, real commit and push, wait, next Pre; the shim counted the next event's git calls):
1. `landedLater` read only the first of `commit`/`push` in a command. `git commit && git push` counted as a commit: no `pushSeen`, no `forget`, a refresh that waited for the commit's ref change and looked at GitHub before the push had landed.
2. The refresh never took kit-fresh's `for-each-ref --no-merged` list, so the first commit after every ref change walked history on the event (kit-fresh 90 to 130 ms).
3. git-guard's offline check judged the kept GitHub heads first, found the just-pushed commit "unpushed", and only then merged the tracking refs: `cat-file`, `log` and `for-each-ref` on the event (139 to 315 ms). Next event after the push: 3 processes (before), 0 (after).
4. The refresh runs detached (own process), not under the daemon's clock; it finished, but kept nothing the Pre read.

Fix: tracking refs are read from the git dir's files (`trackedRefs` in `git-files.mts`) and merged before the first judge, so a pushed commit is already known; `landedLater` sees both words; the refresh waits for the remote's tracking refs to change when the command pushes (otherwise for any ref), then takes GitHub's heads, the Stop look and the kit's kept list (`keepKitRefs`), and takes them again (up to 3 rounds) when a ref moved while it looked. Steady state on the next commit after `commit && push`: 0 git processes for git-guard and kit-fresh, at 3 s and 8 s waits (`build/cc/seq.sh`). Test: `commit-cost.test.mts` "the commit after a `git commit && git push`..." (two rounds, kit repo, real commit and push between), red `red4.txt`, green `green4.txt`.

Refresh children and `daemon stop`: reproduced (`build/cc/stop.mts`). The children are children of the daemon process (started from a worker with a plain detached spawn, which the pool does not track); `daemon stop` took 154 ms and was not blocked by them, but they were left running (reparented to init) for their whole wait, up to 30 s, three at once for three pushes. I could not reproduce a stop that does not finish; the soak's "did not stop" is more likely the 5 s limit in `daemon stop` under load 20 (workers mid-git); not changed, no evidence. Fix: under a daemon (`underDaemon()` in `child-group.mts`) the refresh starts as one of the worker's process groups (`startGroup`), which the pool ends on a stop; from the per-hook runner it stays an independent spawn. Test: `test/integration/refresh-ends-with-daemon.test.mts`, red `red5.txt` (the child outlives the stop), green `green5.txt`.

Tests run (`CLAUDE_PACKS_TEST_CORES=3 taskpolicy -b ... --test-concurrency=2`, output `build/commit-cost-gate.txt`): commit-cost, git-guard, kit-fresh, kit-fresh-look, remote-heads, refresh-ends-with-daemon, daemon-start-line, resident: 40 of 40 pass. `npm run check` 0; `node scripts/counts.mts --check` green.

Open: a refresh for a commit made in a linked worktree is keyed to the project's main checkout (`ctx.projectDir`), as before. Several forced refreshes (one per push) still run side by side for up to their wait; each is bounded and now ends with the daemon.
