# gov-route: W8.8 items 3, 4 and 5 (`governed`, the Bash routing and the agent slot, the pause), `load ask` under 50 ms, the measured wave

Branch `work/2.0.0-ts-gov-route`, from `origin/work/2.0.0-typescript` (d70e233), on gov-core's API. Priority 0.6. Every test run at
`CLAUDE_PACKS_TEST_CORES=3` under `taskpolicy -b`, after `load ask --for test --priority 0.6`.

## What I made

1. **`governed`** (item 3), `packs/base/tools/governed.mts`, installed as `.claude/tools/governed.mjs`:
   `governed [--for KIND] [--want N] [--priority P] -- <command>`. It waits for its grant with the governor's own queue
   (`grantWhenFree`, the loop buildq had, moved into `governor.mts` so both call one), saying one line on stderr every 30 s; starts
   the command `detached` (its own process group) under `taskpolicy -b` on macOS, `nice -n 15` elsewhere; records the group with the
   grant (`adopt(host, id, pgid)`, new in `governor.mts`) so the watchdog can pause it; sets the grant's environment (a lower count the
   caller already set is kept) and the kind's own flags where the program takes them directly (make/ninja `-j`, cut or added;
   `go test -fuzz`'s `-parallel`; `node --test`'s `--test-concurrency`, cut when asked higher); forwards SIGINT/SIGTERM/SIGHUP to the
   group; frees the grant in `finally` (a kill frees it by the stale rule: the grant is held by governed's own pid); exits with the
   command's code (128 + signal for a signal). Inside a governed job (`CLAUDE_PACKS_GOVERNED` set) it runs the command as it is.
2. **The routing** (item 4), the hook `governor-route` (`packs/base/hooks/governor-route.mts`, its table and rewrite in
   `hooks/lib/heavy-commands.mts`, its selftest in `hooks/lib/governor-route-selftest.mts`):
   - PreToolUse Bash: one table of heavy forms with weights (builds: `cmake --build`, make, gmake, ninja, xcodebuild, `go build|install`,
     `cargo build`, `npm run build`, `swift build`, 4; test runs: `npm|pnpm|yarn|bun test`, `npm run test*`, `node --test`, the kit's
     `scripts/test-changed`, ctest, pytest, `python -m pytest`, `go test`, `cargo test|nextest|bench`, `swift test`, 3; fuzzers:
     `go test -fuzz`, `npm run fuzz*`, 3; installs: `npm ci|install|i|add`, pip install, `uv sync|pip install`, 2; the soak and replay
     scripts, 4). Each heavy segment that starts a list item or a pipe gets `node '<checkout>/.claude/tools/governed.mjs' --for KIND
     --want N -- ` inserted before its command (after its `VAR=` assignments and shell builtins such as `exec`, before binary wrappers
     such as `taskpolicy`, `nice`, `timeout` and the quiet test runner). Left alone: a light command, a governed command or buildq, a pipe
     stage after the first, `sudo`, and a line this reader does not follow (heredoc, subshell, `$(...)`, backticks, braces).
   - Agent|Task PreToolUse: one slot (`kind: agent`), held by the session's process; a start past the budget waits for a slot up to
     40 s inside the hook (timeout 60 in pack.json), then is refused with the governor's answer. SubagentStop frees the session's oldest
     agent slot (`hooks/lib/governor-agents.mts`).
   - Registered in base's pack.json (Bash order 90, Agent order 40, SubagentStop recorder), its worktree case in
     `test/worktree-cases-commands.mts`, its tests row.
3. **The pause** (item 5), `packs/base/hooks/resident/governor-pause.mts` (`Pauser`), run by the sampler on each snapshot
   (`resident/sampling.mts`): load over the ceiling for 30 s pauses one governed job's group (SIGSTOP) in `pauseOrder` (lowest
   priority first, newest among equals), the next one 30 s later; the oldest job is never paused; under the ceiling less 10 % one
   paused job is resumed (SIGCONT) every 10 s, highest priority first; a job paused over 10 minutes is named in the daemon's log once;
   when the daemon stops, the jobs it paused are resumed. Every project's daemon runs a watchdog, so one acts: the holder of a lease
   (`pauser.json` in the governor's folder, taken over after 15 s without renewal or when its holder is gone).
4. **`load ask` without a node start**: `sh .claude/hooks/bin/hook-proxy load ask|take|free|jobs ...`. The Go client
   (`proxy/load.go`, `main.go`) sends `{ load: [...] }` to the project's daemon, which answers with the load tool's own verbs
   (`answerLoad`, new in `packs/base/tools/load.mts`, served by `resident/load-ask.mts`; no event, the idle clock untouched); with no
   daemon, a late answer or a fallback reply the client runs `node .claude/tools/load.mjs` itself. The picker now passes every word
   after `load` (it parsed `uname` with `set --`, which dropped them; now parameter expansion) and, with no binary, gives them to the
   node tool (a first draft lost them: `"$@"` inside a shell function is the function's own; found by hand, the no-binary case added to
   the test).
5. **The test preload** (`test/fresh-tmp.mts`) drops `CLAUDE_PACKS_GOVERNED` and `CLAUDE_PACKS_PRIORITY`: a test run started inside
   `governed` (as every routed `npm test` now is) handed its tests the grant id, so their own `governed` jobs took no grant, and the
   caller's priority, so `load ask`'s line said 0.6. Seen red in the gate run inside governed (below), then on a plant.
6. The `load` skill: the fast form, `governed` and the routing, and that a waiting Bash call keeps its own timeout.

## Measured

| What | Number | Command, evidence |
| --- | --- | --- |
| `load ask` end to end through the picker, the binary and the daemon, 100 asks | p50 31.1 ms, p95 111 ms, at 1-minute load 10.2 (interleaved with the other forms) | `node build/scratch/ask-wall.mts`, `build/evidence/gov-route/load-ask-wall.txt` |
| the same inside the test, under `taskpolicy -b` | p50 38.9 ms, p95 68.9 (a quiet run); p50 53.9 ms in the gate's own run with three test files at once (red there) | `test/integration/load-ask.test.mts`, "hook-proxy load ask answers in under 50 ms end to end"; `build/loadask-test.txt` (quiet), `build/gov-route-gate.txt` (the gate) |
| the binary alone (daemon up) | p50 7.4 ms | `load-ask-wall.txt` |
| the node tool (no daemon), `load.mjs`, a bare `node -e 0`, a bare `sh -c true` | p50 80.3, 73.5, 67.6, 15.5 ms | `load-ask-wall.txt` |
| the heaviest wave replayed through `governed` (three test runs of 18 files each asking 6 at once, `go test -fuzz=FuzzReadReply` 600 s asking 4 workers), the 1-minute load every 5 s | highest 11.95, mean 7.1, 0 of 121 samples over the ceiling 13 (18 cores, budget 10 slots) | `node scripts/governed-wave.mts --out build/evidence/W8.8 --fuzz-seconds 600 --files 18` under `taskpolicy -b`; `build/evidence/W8.8/{load.tsv,jobs.tsv,summary.txt,driver.txt}` |
| its wall against the ungoverned one | 605 s governed; the ungoverned wave of 15:11 ran the same fuzzer for its fixed 600 s at 4 workers and took load 43 (progress.md 15:12, PROMPT.md); its test runs' walls were never recorded, so the governed wave's cost is stated per job instead: each job's wait before its grant was 1, 1, 4 and 1 s; the runs took 60, 3, 212 and 603 s | `jobs.tsv` |
| the fuzzer's throughput, governed | 7.64M execs in 600 s at 2 workers on the efficiency cores (12,700/s), against 28.27M at 4 workers ungoverned (47,000/s, w10b-fuzz-report) | `build/evidence/W8.8/fuzz.txt` |

The replay found nothing that had to wait long: two of the 3-slot test runs and the 3-slot fuzzer fit the 10-slot budget once the
first light run ended in 3 s. test-3's one red is the kit's own install (below), not the wave.

## Plants, red then green (each under `build/evidence/gov-route/`)

| Plant | Red | File |
| --- | --- | --- |
| the hook returns no rewrite for Bash | npm test, cmake --build and go test -fuzz each rewritten | `red-no-rewrite.txt` |
| pipe stages and governed commands not told apart | ls, a governed command and a pipe whose heavy part is not first left alone | `red-pipe-and-governed-routed.txt` |
| an agent's start takes no slot | an agent start past the budget waits; refused when none comes; a stopped agent frees its slot | `red-agent-no-slot.txt` |
| governed takes no grant | two heavy jobs over the budget run one after the other, never together | `red-governed-no-grant.txt` |
| governed sets no settings | a job granted 3 slots runs with CLAUDE_PACKS_TEST_CORES=3 and -j3 | `red-governed-no-settings.txt` |
| the grant held by governed's parent | a killed job's slots are freed on the next read | `red-governed-held-by-parent.txt` |
| the oldest job not spared | the lowest priority (but the oldest) is paused first, the oldest never | `red-pause-oldest.txt` |
| no 30 s hold | nothing is paused before the load has held for 30 s | `red-pause-no-hold.txt` |
| never resumed | the highest priority resumed first, then the next | `red-pause-never-resumed.txt` |
| the client never asks the daemon | load ask under 50 ms end to end (p50 202.6 ms) | `red-load-no-daemon-path.txt` |
| the preload keeps a governed parent's grant | a run inside governed hands its tests no grant and no priority | `red-preload-keeps-grant.txt`, green `green-preload-drops-grant.txt`; first seen in `red-gate-inside-governed.txt` |

Green: `test/hooks/base/governor-route.test.mts` 8 of 8 (the contract's three: selftest 14 cases, worktree case, emitted = source);
`test/tools/base/governed.test.mts` 5 of 5 (the pause case included); the re-run of the gate's failed files
(`governed`, `load-ask`, `test-changed`, `repo-lint`, `fresh-tmp`) 55 of 55 (`build/gate-rerun.txt`); `go vet` clean, `go test ./...`
ok, `TestLoad*` 2 of 2.

## The gate

`npm run check` exits 0; `node scripts/counts.mts --check` exits 0 (after `node scripts/counts.mts`: base's hooks 29 to 30, the site's
49 to 50, the README's hook row); `node scripts/noop-pin.mts` pinned 38 differences, every one this branch's files (the new lib and
tool files in each old project, the changed picker, governor, resident, sampling, load and buildq, the skill;
`build/evidence/gov-route/noop-pin.txt`). The hook itself does not arrive in an old project by `update`, as the switch-on law wants.

`npm run test:changed -- --base origin/work/2.0.0-typescript` (212 files, run through `governed` itself at 3 cores, priority 0.6),
`build/gov-route-gate.txt`: 1,037 tests, 1,028 pass, 9 fail:
- 2 (`governed`'s two-jobs and killed-job cases), 1 (`load ask prints one line`, "priority 0.6"): the env a governed parent hands
  its tests. Mine; fixed in the preload (item 5 above), re-run green.
- gate 5 (emitted files current) and the preload map in `test-changed.test.mts` (my test's comment named the preload's file): mine,
  fixed (built; the comment reworded), re-run green.
- the 50 ms line at p50 53.9 ms: the gate's own three files at once on the efficiency cores. Re-run alone: green (p50 38.9 ms quiet).
  [gap] the line is a timing under load; at the gate's load it sits near 50 ms.
- two watchdog cases of `resident-sampler.test.mts` (an orphan spinner, a test run over the cap): re-run alone, green. The same file's
  RSS case then went red (daemon alone 305 MB, with the sampler 410 MB; in the gate it was 380 and 324, green): the 16-worker RSS swings
  by 90 MB between runs, the open RSS work's ([gap], not this branch: the pauser reads two small files per snapshot).
- "the kit repo has its own base pack installed ... every base hook registered": `governor-route` is not switched on in the kit's
  own install. The lead's step at the merge (as for no-polling in affd593): add `hooks/governor-route.mjs` to the kit's
  `.claude/layout.json` `enable` and run `update`. [deferred] to the lead.

## Choices made with nobody to ask

- `updatedInput` with no `permissionDecision` (Claude Code's hooks reference, PreToolUse decision control): the user's own permission
  rules still decide, now on the rewritten command; an `allow` would have approved every heavy command unasked. Consequence: a rule
  that allows `Bash(npm test)` no longer matches `node '.../governed.mjs' ... -- npm test`, so such a project may be asked once more.
  [gap] for the lead: a `Bash(node */.claude/tools/governed.mjs *)` allow rule would let any command through governed, so it is not added.
- The brief said to read how `updatedInput` is used "in the hooks lib's existing users"; there were none (grep of packs, lib, test: 0).
  The reference was read instead (the PreToolUse decision control section and its auto-mode note).
- The routing inserts before the command, never rewrites it whole, so redirections and pipes stay with the shell; a line this reader
  cannot follow is left alone (a miss, never a wrong rewrite).
- `governed` waits synchronously (`napSync`, as buildq did) and a signal during the wait ends it; its ticket's pid is then gone and the
  next read drops it. A waiting Bash call keeps Claude Code's own timeout (2 minutes by default): the skill says to give a heavy command
  room or run it in the background.
- `governed` is a node process of its own, not "through the resident runner": the grant is held by its pid, which must live as long as
  the job; the governor's state is a shared file, so no daemon is needed for it to be right.
- The agent slot waits up to 40 s inside the hook, then refuses with the governor's answer: a hook cannot wait as long as a slot may
  take. Its grant is held by the session's process and freed at SubagentStop (the session's oldest agent slot) or when the session ends.
  [gap] an Agent call another hook refused after this one took the slot keeps it until a SubagentStop or the session's end.
- The pause works from the daemon's sampler; with no daemon and no sampler nothing pauses (the grants still hold the budget). The
  measured wave ran the same `Pauser` in its driver, since the main checkout's daemon runs the code before this branch.
- The order's line is "the newest governed job is paused"; item 0b (later) says the lowest priority first: gov-core's `pauseOrder`
  (lowest priority, newest among equals) is used, and the oldest is never paused.
- macOS low priority is `taskpolicy -b` as the order and the 2026-11-12 constraint say, though buildq's `gentle` keeps `nice` (KWB-149).
- The README's hook row for `governor-route` was written by hand (counts asks for the hand-written cell of a new base hook), though the
  wave rules keep `README.md` unchanged otherwise; the rest of the README moved only by `node scripts/counts.mts`.
- The measured wave's ungoverned wall is not re-run (the brief's rule); the record holds only the fuzzer's fixed 600 s, so the comparison
  is per job, with each job's wait.
- The fuzzer of the replay is `FuzzReadReply` (one of the two Go fuzz targets); the wave of 15:11 ran W10b's Go fuzzer.
- The header says never a fuzzer; this agent's own section asks for the replay with one. The replay was run once, through `governed`,
  at the fuzzer's granted `-parallel=2`, with no other test run of mine beside it.

## Refusals met

`git-guard` refused a `git checkout` twice on a tree with uncommitted work (right: committed first, then planted and restored). Two
"hooks could not read what this command writes" notes on source files written by inline python (right; I moved to Write and Edit for
source). Not marked with `logs mark`: the logs are the main checkout's, which this agent does not write.

## For the lead

- Switch on `governor-route` in the kit's own install (`enable`, then `update`), which turns the last red of the gate green. From then
  on every heavy Bash command of the kit's sessions runs through `governed`.
- `load ask` for agents: `sh .claude/hooks/bin/hook-proxy load ask --for test --priority P` (about 30 ms) once the kit's install has
  this picker and binary.
- The test preload change matters as soon as the routing is on: without it a routed test run hands every test its grant.

## Files

`packs/base/tools/governed.mts`, `packs/base/hooks/governor-route.mts`, `packs/base/hooks/lib/{heavy-commands,governor-agents,governor-route-selftest}.mts`,
`packs/base/hooks/lib/governor.mts` (`adopt`, `grantWithin`, `grantWhenFree`), `packs/synth-creator/tools/buildq.mts` (calls `grantWhenFree`),
`packs/base/hooks/resident/{governor-pause,load-ask,sampling}.mts`, `packs/base/hooks/resident.mts`, `packs/base/hooks/lib/proxy-wire.mts`
(`load` in the request), `packs/base/tools/load.mts` (`runLoad`, `answerLoad`), `packs/base/hooks/bin/hook-proxy`, `proxy/{load,load_test,main}.go`,
`packs/base/pack.json`, `packs/base/skills/load/SKILL.md`, `scripts/governed-wave.mts`, generated `README.md`, `site/index.html`,
`packs/manifest-2.0.0.json`, `test/fixtures/noop/pinned-manifest.json`; tests `test/hooks/base/governor-route.test.mts`,
`test/tools/base/governed.test.mts`, `test/integration/load-ask.test.mts`, `test/worktree-cases-commands.mts`, `test/fresh-tmp.mts`,
`test/unit/fresh-tmp.test.mts`.

## Open

- [deferred] the kit's own install: `governor-route` switched on (the lead's merge step).
- [gap] the 50 ms line as a test is a timing under load: p50 31 to 39 ms here quiet, 53.9 ms at the gate's own load.
- [gap] an allowed-command permission rule no longer matches its routed form.
- [gap] a slot taken by an Agent call another hook then refused stays until SubagentStop or the session's end.
- [gap] `resident-sampler.test.mts`'s RSS case swings by 90 MB between runs (the RSS work's).
