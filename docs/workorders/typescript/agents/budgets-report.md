# budgets: doctor --strict on the kit's own live install

Branch work/2.0.0-ts-budgets (from origin/work/2.0.0-typescript). Evidence in `build/evidence/budgets/`. The main checkout's daemon and install were not touched.

## What was made

1. git-guard, law 9 (`unpushed`, lib/branches-ahead.mts, lib/remote-heads.mts, lib/stop-look.mts). The Pre Bash event never calls GitHub.
   - `remoteHeads` has an `offline` option: it answers from the kept look (`claude-packs-heads.json`); only when none was ever kept, or a push was seen since it, is the look taken live.
   - `withHeads` with `offline`: when the kept look would refuse, the repo's own remote-tracking refs (`trackedHeads`, one `git for-each-ref`, read only then) are added and the law judged again. No second, live, look.
   - `pushSeen` (file `claude-packs-pushed` in the git dir) is written by `landedLater` when a push command passes; a push by URL (the house form) moves no local ref, so the next commit event takes one live look and keeps it. `refreshStop` (the detached `--refresh-stop`, started after every commit and push) now also takes the live look of origin's heads and keeps it, so the common case is that the detached process has already refreshed the kept look before the next event.
   - What the law can now miss: a commit pushed from another machine, or by URL without this hook seeing the command (a push from a terminal), is not known until the detached refresh runs; the law then refuses a commit on a branch GitHub already has. That is a false refusal (never a missed one): the next detached refresh or any seen push corrects it, and the message already names the push to run. It cannot let an unpushed commit through, since a commit is cleared only by a head the kept look or a tracking ref holds. Acceptable because the law's job (no stacking of local commits) is judged on this machine's facts; the network only ever cleared it.
2. kit-fresh (lib/kit-fresh-look.mts `kitVerdict`): a `git merge-base --is-ancestor` per remote work branch plus a `rev-parse` became one `git for-each-ref --no-merged HEAD` over `refs/remotes/origin/main` and `refs/remotes/origin/work`. The commit-time cost is two git calls whatever the number of branches. The brief's "kept answer, refreshed detached" was not needed: no child other than git ran, and no registry look is made at a commit (npm is asked at SessionStart, once a day, kept).
3. repo-litter: `git ls-files --others --modified` ran for every `git add` argument. A plain file that nothing faults by name, dump pattern or size is now cleared without asking git; only a file with a fault is confirmed as staged. Same verdicts (selftest unchanged, 11 cases).
4. template-law first call: `resident/warm.mts`, a worker thread started by `resident.mts` at daemon start, builds the repetition index (`repoIndex`) and the duplicate index (`loadIndex`) once; both keep their result in the temp folder, so the main thread's first query reads it instead of walking the tree. The main thread is not blocked; an ask from a worker that arrives meanwhile is held by the pool (`warming`, pool.mts) and answered when the warm-up ends. The brief said an event before it is ready is judged by the one-shot path; that needs a nullable `ctx.candidates` result (types.d.mts, not mine to change), so the choice taken is to hold that one ask for the rest of the warm-up (the main thread keeps serving every other event). Proposal for the lead if the one-shot fallback is wanted: `candidates?: (hashes) => Promise<FileStatements[] | null>`.
5. once-only-index at Post: the cost is the dup index read and rewritten on each Edit in a worktree (the daemon holds only the main checkout's). The hook's own work is unchanged; the protocol allows answering first, so `serveEvent` (resident/event.mts) now runs a PostToolUse call's recorders after the reply, in turn as before, and logs each as a hook that answered late (`lateLine`: hooks.log line, a crash or refusal into its log). A Pre call's recorders are still waited for. Doctor's hook timing for once-only-index will still show 120 to 148 ms (it is that hook's own time); the Post event wall no longer includes it.

## Measured

| What | Before | After | Command / evidence |
|---|---|---|---|
| git-guard on a commit with the origin out of reach and a stale kept look | p95/worst 15,233 ms (git's 15 s) | worst 235 ms (first call of a cold daemon), p50 0 | `node --import ./test/fresh-tmp.mts --test test/integration/git-event-speed.test.mts`; `git-speed-red.txt`, `git-speed-green.txt` |
| kit-fresh on 15 commit/add calls (kit repo, one remote branch) | p95 71 ms | p95 51 ms (more branches: the old cost grew by two git calls each, the new does not) | `git-speed-red2.txt` vs `git-speed-green.txt` |
| repo-litter on 12 `git add` calls | p50 19, p95 30 ms | p50 0, p95 1 ms | same |
| first Pre Write after a daemon start (300 files) | 464 ms | 61 ms | `live-event-speed.test.mts` "first Pre Write"; `first-write-red.txt` (warm call removed), `first-write-green.txt` |
| a PostToolUse call with a 300 ms recorder | waited 300 ms | answered under 150 ms | resident selftest case; `post-red.txt` |

The doctor numbers of the brief came from a live tree with worktrees and a long history; the scratch rig is small, so the before/after of kit-fresh and repo-litter understate what the live tree will show. Re-run `doctor --strict` on the live install after the lead updates it (the last 100 calls must roll over first).
The worst of git-guard (235 ms) is the first call after the daemon starts; the doctor's 200 ms worst can still catch a cold first call.

## Plants (red then green)

- git-guard selftest, new `offlineCases` (6 cases): GitHub away with no push seen is judged from this machine alone, no warning; the push command seen takes one live look and keeps it; once kept, GitHub away changes nothing; a push by name is cleared by the tracking ref. Red: `branches-ahead.mts` without `offline` -> "GitHub away, no push seen ... (got false, wanted true)" (`git-guard-red.txt`). Green: `git-guard selftest: OK (... 6 offline cases ...)`.
- kit-fresh-look unit test (planted git now answers `for-each-ref` only): red on the old `kitVerdict` (`kit-fresh-red.txt`: 4 pass, 1 fail), green on the new.
- resident selftest `PostSlow` plant: red with the old `serveEvent` (`post-red.txt`), green 44 cases.
- resident-parts test "the index warms in a worker thread": checks `warming()` is set, the main thread built nothing, the kept index file exists afterwards. It was first red for a real fault in the code under test (the warm worker inherits the parent's `--import`, so a test run gave it a temp folder of its own; fixed with `execArgv: []`). It was not run against a missing `warm`; the integration test "first Pre Write" is the red/green for that.
- git-event-speed and live-event-speed tests (integration, need the Go proxy binary built).

## Files changed

packs/base/hooks/lib/{remote-heads,branches-ahead,stop-look,kit-fresh-look,git-guard-selftest,pushed-selftest}.mts, packs/base/hooks/repo-litter.mts, packs/base/hooks/resident.mts, resident/{event,index,pool,warm,selftest-events,selftest-plants}.mts, packs/base/pack.json (warm.mts row), test/hooks/base/resident-parts.test.mts, test/unit/hooks-lib/kit-fresh-look.test.mts, test/integration/{git-event-speed,live-event-speed}.test.mts, test/integration/proxy-fire-rig.mts (`proxyRig`, shared by both), packs/manifest-2.0.0.json and test/fixtures/noop/pinned-manifest.json (`node scripts/counts.mts`, `node scripts/noop-pin.mts`; the noop diff is exactly the 13 installed files above, per configuration, warm.mjs new), build.md (making line).

## README and counts

`node scripts/counts.mts --check` is green. No README cell moves (no pack, hook, check or skill added; warm.mts is a file of an existing hook). No count in the site moves.

## Open

- Re-measure on the live install after the update; the 200 ms worst can still be hit by the first call after a daemon start.
- The one-shot fallback for an ask during the warm-up needs a nullable `candidates` in types.d.mts (proposal above).
- A false refusal of law 9 for a commit pushed from elsewhere (see 1) lasts until the detached refresh; no refusal was met in the tests.
- No refusal by a hook was met that was wrong.
