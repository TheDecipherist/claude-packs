# The TypeScript order: before and after

Internal report, W11 item 2. Plain words. Finished 2026-11-13 from `docs/workorders/typescript/after.md` and `docs/workorders/typescript/numbers.json`
(W11.1's measured afters), `docs/workorders/typescript/ab.md` (W11.0) and the earlier steps' evidence.

How to read it. Every row ends with the file it comes from. `build/evidence/...` lives only in the main checkout of the machine that ran
the order (ignored by git); `docs/workorders/typescript/...` is tracked. "Before" is the tree at the baseline commit f2a518e (the first
commit plus W0.1 to W0.4 and W0.6, no code converted: d-14) unless a row says otherwise. A number that got worse is written as worse.
Rows have ids: a numbered row of section `W3` is `W3-1`; the comparison table's rows are `T-a` to `T-l`; the missed targets are `M-1` and up.
`docs/workorders/typescript/showcase.md` and `docs/whats-new-in-2.0.md` cite these ids, and `test/unit/lib/report-evidence.test.mts` holds the citations (below). The check
reads the evidence files under `build/` only when `build/evidence` is present (it is on the machine that ran the order, not in a clone);
the tracked files are checked always.

## The comparison table
W0.5's twelve measurements, taken again in W11.1 by the same command on the same Mac (darwin arm64, 18 cores, node v26.12.1), alone. The
load average at the start of each is in `docs/workorders/typescript/after.md`. Ratio is before over after for a time that fell, after over
before (written "slower" or "bigger") for one that rose.

| id | measurement | before (W0) | after (W11) | ratio | evidence |
|---|---|---|---|---|---|
| T-a | (a) the whole suite, once | 637 tests, 630 pass, 7 fail, 753 s | 1,650 tests, 1,641 pass, 9 fail, 868.6 s (1.15x the wall for 2.6x the tests; the 180 s line is missed, d-27, d-37) | 2.6x the tests in 1.15x the time | `build/evidence/W0/baseline.md`, `build/evidence/W11/suite-runs.txt`, `build/session4/suite3.txt` |
| T-b | (b) gate for a one-hook change (no-find) | 188.3 s, 5 of 87 test files | 12.9 s, 2 of 372 | 14.6x faster | `build/evidence/W0/gate-b1.log`, `build/evidence/W11/gate-b1.log` |
| T-b2 | (b) gate for a git-guard change | 326.6 s, 10 of 87 | 57.2 s, 2 of 372 | 5.7x faster | `build/evidence/W0/gate-b2.log`, `build/evidence/W11/gate-b2.log` |
| T-c | (c) gate for a one-lib change (`lib/layout`) | 19.0 s, 2 of 87 | 59.6 s, 13 of 372 | 3.1x slower (a miss) | `build/evidence/W0/gate-c.log`, `build/evidence/W11/gate-c.log` |
| T-d | (d) release, commit to npm, one-hook change | about 937 s | 29.5 s (lib 22.5 s, content 30.8 s) | 31.8x faster (about 32 times) | `build/evidence/W0/gate-d.log`, `build/evidence/W11/release-measure-hook.txt`, `build/evidence/W11/measured-hook.json` |
| T-e | (e) init + doctor, cache empty | 34.0 s | 39.7 s | 1.17x slower (a miss) | `build/evidence/W0/baseline-measured.md`, `build/evidence/W11/retake/baseline-measured.md` |
| T-e2 | (e) init + doctor, cache warm | 9.1 s | 1.95 s (doctor alone 0.85 s against 4.5 s) | 4.7x faster | `build/evidence/W0/baseline-measured.md`, `build/evidence/W11/retake/baseline-measured.md` |
| T-f | (f) update, warm | 4.6 s | 1.14 s | 4.0x faster | `build/evidence/W0/baseline-measured.md`, `build/evidence/W11/retake/baseline-measured.md` |
| T-g | (g) the replay of bandwarp's log (5,583 events), summed hook wait | 1,107.4 s (as recorded under 1.9) | 214.6 s | 5.2x less | `build/evidence/W0/replay-g.md`, `build/evidence/W11/replay-proxy.md` |
| T-g2 | (g) the same replay on the 1.9.0 tree, same method | 1,647.4 s | 214.6 s | 7.7x less | `build/evidence/W11/replay-v19.md`, `build/evidence/W11/replay-proxy.md` |
| T-g3 | (g) Stop, p50 and p95 over 124 Stops | 279 ms and 6,067 ms | 54.2 ms and 76.9 ms | 5.1x and 78.9x faster | `build/evidence/W0/replay-g.md`, `build/evidence/W11/replay-proxy.md` |
| T-g4 | (g) Pre Bash p50 and p95 over 2,190 events | 105 ms and 733 ms | 33.9 ms and 47.9 ms | 3.1x and 15.3x faster | `build/evidence/W0/replay-g.md`, `build/evidence/W11/replay-proxy.md` |
| T-g5 | (g) UserPromptSubmit p50 | 47 ms | 77 ms | 1.6x slower (a miss) | `build/evidence/W0/replay-g.md`, `build/evidence/W11/replay-proxy.md` |
| T-h | (h) one Bash event through the install's entry, runner alone | 90 ms (6 hooks) | 123 ms | 1.4x slower (a miss) | `build/evidence/W0/baseline-measured.md`, `build/evidence/W11/retake/baseline-measured.md` |
| T-h2 | (h) the same through the Go client and the daemon | 90 ms | 38 ms | 2.4x faster | `build/evidence/W0/baseline-measured.md`, `build/evidence/W11/retake/baseline-measured.md` |
| T-i | (i) the status line, one render, live from the daemon | 67 ms, 3.0 s CPU a minute | 26.6 ms, 0.6 s CPU a minute | 2.5x faster, 5.0x less CPU | `build/evidence/W0/baseline-measured.md`, `build/evidence/W11/live-main-install.txt` |
| T-j | (j) tsc's build | 0 s (no build) | 0.5 s warm | new cost | `build/evidence/W11/retake/baseline-measured.md`, `build/evidence/W11/tsc-cold.txt` |
| T-k | (k) npm pack | 0.84 MB, 1,021 files | 6.95 MB, 1,150 files | 8.3x bigger (a miss, the binaries) | `build/evidence/W0/baseline-measured.md`, `build/evidence/W11/pack-parts.txt` |
| T-l | (l) doctor --fresh | 29.8 s | 38.5 s | 1.3x slower (a miss) | `build/evidence/W0/baseline-measured.md`, `build/evidence/W11/retake/baseline-measured.md` |

row (a): measured by the lead, build/evidence/W11/suite-runs.txt

Row (a), run 3, alone on the machine at load 4 (build/session4/suite3.txt): 1,650 tests, 868.6 s. The 9 reds: four tests stale against merged work or against the files' own lists (fixed in 38e8e01 and 497b363, KWB-218), and five that fail only inside the suite's load (live Pre Write p50 583 ms against 21 ms alone, `load ask` 72 ms against 38, the pool 101 MB against 100, the kit's own doctor on a log with cold calls, the KWB-96 worktree case); each passes alone (d-37). Runs 1 and 2 (build/evidence/W11/suite-runs.txt) exited 1 with 8 reds each.

Rows (b) and (c) are the same command as W0: touch one file, run the picker's tests through `quiet-test`. Row (g) before is the log as
bandwarp's 1.9 recorded it under its own load; the second line replays the 1.9.0 tree (`git archive 905e6be`, not on npm) by the same method as
the after, which is the fair pair. The 1.9.0 totals carry two stalls (a 196 s Pre and a 140 s Post Bash in run 2); the trimmed total is 1,311.0 s
and the other run summed 1,306.2 s, so the factor is 6.1x without them. Evidence: `build/evidence/W11/replay-v19-trim.md.json`, `build/evidence/W11/replay-v19-run1.md`.

## W0. Set up
W0 changed no code. Its "after" is the baseline every later step is held to.
1. The whole suite, once: 637 tests, 630 pass, 7 fail, wall 753 s at load 2.48. The seven reds are named with reasons (kit-fresh's
   SessionStart entry first, selftests taken as proved under the gate, raw JSON calls 550 against 547, `git checkout --theirs` outside a
   merge let through, the order's own files naming the user, kit-fresh's case wanting the lock's version). Each was fixed at W4 or W5.
   Evidence: `build/evidence/W0/baseline.md`, `build/evidence/W0/suite-a.log`.
2. One-hook gates: `no-find` 188.3 s (5 of 87 test files), `git-guard` 326.6 s (10 of 87); one-lib gate (`lib/layout`) 19.0 s (2 of 87).
   Evidence: `build/evidence/W0/baseline-measured.md`, `build/evidence/W0/gate-b1.log`, `build/evidence/W0/gate-b2.log`, `build/evidence/W0/gate-c.log`.
3. Release rehearsal: the gate against origin/main 934.5 s (87 files, the seven reds), about 937 s from commit to what would be the
   publish. Evidence: `build/evidence/W0/gate-d.log`, `progress.md` (W0.5(d)).
4. `init --config synth-creator cpp audio-core` plus `doctor`: 34.0 s cache empty, 9.1 s warm; `update` 4.6 s; `doctor --fresh` 29.8 s.
   Evidence: `build/evidence/W0/baseline-measured.md`.
5. One Bash event through the runner and its 6 hooks 90 ms median of 10; status line 67 ms a render, 3.0 s CPU a minute; `tsc` build 0 ms
   (no build); `npm pack` 0.84 MB, 1,021 files. Evidence: `build/evidence/W0/baseline-measured.md`.
6. Replay of bandwarp's hook log (99,898 lines, 5.72 h, 5,583 events, kept as a fixture with 0 paths or names): Pre Bash wall p50 105 ms /
   p95 733 over 2,190 events, Pre Write 235/736, Stop 279/6,067 over 124. Evidence: `build/evidence/W0/replay-g.md`, `progress.md` (W0.5(g)).
7. `suite-once` refused the prompt `run.sh` passes for a full-suite session: KWB-168, fixed with three selftest cases, the grant red
   before the fix; run.sh's prompt exits 0, the plain prompt exits 2. Evidence: `build/evidence/W0/suite-once.txt`.
8. Admiral pack merged, KWB-154/124/120/116 closed, `typescript` 7.0.2 and `@types/node` 22.20.5 pinned with rows in `docs/versions.md`,
   the ten folders in `.claude/layout.json`. Evidence: `progress.md` (W0.1 to W0.4).

## W1. Find out, before building
1. Whole tree under `tsc` 7.0.2, `checkJs`, strict set: 187 files, 3,742 errors, 0.28 s cold / 0.21 s warm; 87 unresolved imports, all
   merged-install files, all resolved by `rootDirs`. Largest: `packs/base/hooks` 1,706, other packs 795, `lib` 772. Evidence:
   `build/evidence/W1/tsc-tables.md`, `build/evidence/W1/tsc-tree-1.time`, `findings.md` {#w1-2}.
2. Language server: `tsc --lsp --stdio` via the kit's plugin; a child session's `LSP` tool answered definition, references (75 in 28
   files) and incoming calls (33). Before: none. Evidence: `build/evidence/W1/lsp-tsc-replies.txt`, `findings.md` {#w1-1}.
3. Emit end to end on two files: `tsc` 0.22 s warm, 0 errors; package 1,022 files, 0 `.mts`; fresh-project install has 0 `.mts` in
   `.claude/`, `doctor --strict` OK; lock hash = installed = emitted for all three. Evidence: `build/evidence/W1/emit-hashes.txt`, `findings.md` {#w1-3}.
4. Copied install (fresh, and after three events) passes `doctor --strict`; no absolute path in settings, lock, layout or state.
   Evidence: `build/evidence/W1/fixture-fire-b.txt`, `build/evidence/W1/fixture-fire-c.txt`.
5. Readers blind to TypeScript: the same 400-line file and copied function judged as `.mjs` (exit 2, 2), unjudged as `.mts`/`.cts` (exit 0, 0).
   After W2.8, 6 of 6 judged. Evidence: `build/evidence/W1/readers-before.txt`, `build/evidence/W2/readers-after.txt`.
6. Daemon, nine probes. Eight racing clients: 1 daemon started, all judged. Slow hook holding a worker 1.7 s with six events asking:
   pool 1 the six wait 1,664 to 1,668 ms; pool 4 they take 18 to 34 ms. Kill mid-event: exit 2 in 466 ms, never 0. Stale socket: exit 2
   in 166 ms then 18 ms. Stdout JSON byte for byte equal. Index round trip 0.06 to 0.10 ms. Evidence:
   `build/evidence/W1/daemon-probes.md`, `build/evidence/W1/daemon-probe5.md`, `findings.md` {#w1-5}.

## W2. The foundation
1. Type errors on the converted files: 3,742 (W1.2's strict read) to 0; `npm run check` exit 0 over sources and tests. Evidence:
   `findings.md` {#w1-2}, `progress.md` (W2 done).
2. A build that did not exist: `tsc -b` 0.31 s warm (before: no build). A new cost, small; the bound was 2 s. Evidence: `progress.md`
   (W2.1), `build/evidence/W1/tsc-tree-2.time`.
3. Twelve repo-lint gates (no `any`, no silencer, shared shapes once, emit current, no process global outside the main tail ...), each
   seen red on a plant. Before: none. Evidence: `build/evidence/W2/gates-6-10-red.txt`, `progress.md` (W2.7).
4. Readers read `.mts`/`.cts` through one table (`source-exts.mts`); KWB-170 fixed, test red first. 0 of 6 probe writes judged before,
   6 of 6 after. Evidence: `build/evidence/W2/readers-after.txt`, `build/evidence/W2/kwb170-red.txt`.
5. The picker reads TypeScript: a planted `.mts` change picks its test; W0's picker reads only `.test.mjs` and picks 0 on the converted
   tree. Evidence: `build/evidence/W2/picker-red.txt`, `progress.md` (W2.6).
6. First owners (`files.mts`, `git-run.mts`, `hash.mts`, `source-exts.mts`) and the shared shapes in `types.d.mts`; pilot converted and
   installed from the tarball with 0 `.mts`. Evidence: `progress.md` (W2.4, W2.5, W2.10).
7. The kit's own `kit-lock` stayed live through the move (KWB-172: it crashed while a lib was half built, 8 calls refused). The `LSP`
   tool answered definition, references and incoming calls for `readJson`. Evidence: `build/evidence/W2/kit-lock-after-update.txt`,
   `build/evidence/W2/lsp-readjson-replies.txt`.

## W3. The core: packs/base/hooks/lib, by layer
1. Hand-written `.mjs` in `packs/base/hooks/lib`: 60 files, 5,150 lines at the baseline; 0 at the end of W3 (house.py the one named
   exception until W4). Evidence: `progress.md` (W3 done); `git ls-tree` at f2a518e.
2. Every base hook's selftest green on the emitted lib: `doctor --fresh --strict` OK. Evidence: `build/evidence/W3/doctor-fresh.txt`.
3. Re-entrancy: 31 hooks read the project root per call; no `process.env`/`cwd`/`exit`/stream reassignment outside the main tail (gates
   11, 12); runner output capped at 9,000 characters with a line naming what was cut; three re-entrancy tests. Before: a daemon would
   judge only the first project. Evidence: `agents/w3-root-report.md`, `agents/w3-runner-report.md`.
4. Splits forced by the 300-line limit, by job: `shape` into four files, `shell-writes` with `shell-sed`, `pushed` into four,
   `run-status` into four. Evidence: `agents/w3-l3-shape-report.md`, `agents/w3-l2-shell-report.md`, `agents/w3-l4-git-report.md`, `agents/w3-l4-status-report.md`.
5. Layering faults fixed: `json` a leaf; `hook-log` no longer imports `layout`/`event-log`; `look-gate` and `skill-first` load their
   selftest only under `--selftest`. Evidence: `agents/w3-l2-hooklog-report.md`, `progress.md` (W3 L0, L1).
6. Faults the typing found: KWB-174, 177, 178, and the decision of 180 (see the bugs section). Evidence: `workflow-bugs.md`, `agents/w3-l1-writes-report.md`.

## W4. The slices, in parallel
1. Hand-written `.mjs`/`.js`/`.py` left in `bin`, `lib`, `global`, `scripts`, `packs`: 0 (before: 254, 3,087, 496, 440 and 12,920 lines of
   `.mjs`, plus 2 `.py` of 273 lines). Evidence: `progress.md` (W4 wave 4, W4 done); `git ls-tree` at f2a518e.
2. Copies, per kind: git runners 22 definitions to 1, payload parses by hand 22 to 0, hook tails by hand 33 to 0, `isMain` by hand 11 to 0,
   heredoc cutting 8 to 1 owner and its caller. Copies left: 0 in every kind. Evidence: `build/evidence/W4/copies.md`.
3. Whole suite after the last merge: 926 tests, 918 pass, 8 fail, 1,002 s at load 10, against 637, 630, 7, 753 s. Seven reds are W0's
   own; the eighth (gate 3b, "git tracks no file it ignores") was new, caught by a gate made for it, fixed in 8be5c4b. The wall is longer
   because of 289 more tests and a busier machine. Evidence: `build/evidence/W4/suite-vs-baseline.md`, `build/evidence/W4/full-suite.txt`.
4. `python3` in a scratch gpu-painter install's `settings.json`: 0 lines (the guard was a Python hook before; the earlier count was not
   measured). `init sound-design` alone exits 2 naming the requirement. Evidence: `build/evidence/W4/python-and-requires.md`.
5. Hook contract: `hook(event, ctx)` returns a Verdict, run by `runAsHook`/`run-hooks`; 33 hand tails gone. Evidence: `agents/w4-contract-report.md`.
6. Open refusals read and marked: 49, 47 right and 2 wrong (logged as KWB-182). Evidence: `progress.md` (W4 checks).
7. KWB-183 (`making-check` read an emitted twin as a copy) fixed, selftest case red first (got 2, wanted 0). Evidence: `workflow-bugs.md`, `progress.md`.

## W5. The tests: three tiers
1. Test files: 92 `.mjs` (8,403 lines) before; 0 `.test.mjs` left, 366 `.test.mts` at the branch head. Evidence: `build/evidence/W5/summary.md`; `git ls-tree`.
2. Tests: 637 to 1,326, all green; every baseline name present or mapped (12 not present by name: 2 renamed, 3 in d-12, 7 split); a planted
   deletion shows as gone. Evidence: `build/evidence/W5/names-baseline.txt`, `build/evidence/W5/names-now.txt`, `build/evidence/W5/allowed-gone.txt`.
3. Red tests: 7 before, 0 at suite-4 and suite-5 (1,326 of 1,326). Evidence: `build/evidence/W5/summary.md`, `build/evidence/W5/suite-4.txt`, `build/evidence/W5/suite-5.txt`.
4. Wall: 753 s (637 tests) to a median of 982 s (1,326 tests): longer in total, faster per test (0.85 to 1.35 tests a second). The 180 s
   target is NOT met. 29 files over 60 s at the start; 8 selftest- or doctor-bound files still at 60 to 98 s. Evidence:
   `build/evidence/W5/summary.md`, `build/evidence/W5/file-seconds.txt`.
5. `init` call sites in tests 61 to 38; one fixture builder with a build lock; the copier's plant red. Evidence: `build/evidence/W5/summary.md`, `progress.md`.
6. A selftest proved once in a run is not run again by hook tests or doctor. Evidence: `progress.md` (W5 wave 3).
7. KWB-185, 186, 187, 188 found by the new unit and install tests. Evidence: `workflow-bugs.md`.

## W6. The kit end to end, and the change-to-tests map
1. `no-find` gate 188.3 s (5 of 87 files) to 22 s (2 of 314): 8.6 times faster. Evidence: `build/evidence/W0/gate-b1.log`, `build/evidence/W6/6-gate-b1.log`, `build/evidence/W6/summary.md`.
2. `git-guard` gate 326.6 s (10 of 87) to 57 s (2 of 314): 5.7 times faster. Evidence: `build/evidence/W0/gate-b2.log`, `build/evidence/W6/6-gate-b2.log`.
3. `lib/layout` gate 19.0 s (2 of 87) to 61 s (10 of 314, 34 of 34 pass): 3.2 times SLOWER, because ten files now reach the lib and the old
   picker saw only `.test.mjs`. The bound (under 90 s) is met; the number is worse. Evidence: `build/evidence/W0/gate-c.log`, `build/evidence/W6/6-gate-c.log`.
4. `doctor --fresh` 29.8 s to 31.3 and 31.9 s: no change, under the 60 s bound. Evidence: `build/evidence/W0/baseline-measured.md`, `build/evidence/W6/6-doctor-fresh-1.txt`, `build/evidence/W6/6-doctor-fresh-2.txt`.
5. `npm pack` 0.84 MB / 1,021 files to 0.98 MB / 1,058 files, 0 `.mts`, `.d.mts`, `.tsbuildinfo`, `.map`; fresh install under Node 22.23.3 passes
   `doctor --strict`; `tsc -b` warm 0.29 s. Evidence: `build/evidence/W6/3-pack.txt`, `build/evidence/W6/install.txt`, `build/evidence/W6/6-tsc-warm.txt`.
6. Kit's own install: `update --dir .` exit 0, `doctor --strict` 0 problems. `LSP` from a child session: `readJson` 98 references in 43
   files, `writesOf` 15 callers, `sync` 38 outgoing calls. Evidence: `build/evidence/W6/2-update.txt`, `build/evidence/W6/2-doctor-strict.txt`, `build/evidence/W6/5-lsp.txt`.
7. The three hook-gate reds in the timed runs are the noop test's, by design (a touched hook is an installed file whose manifest line
   `node scripts/counts.mts` writes in the same commit). Evidence: `build/evidence/W6/summary.md`.

## W7. Packs from one template, and the hand-kept facts generated
No build/evidence/W7 exists; numbers are in the three agent reports and `progress.md`.
1. Configuration files: 8 files of 86 to 175 lines (919 in all) to `shared.json` (40 lines) plus 8 deltas of 4 to 37 lines (142 in all);
   each merged result equals the old file. Evidence: `agents/w7-b-report.md`; `git show f2a518e:configurations/<name>/config.json`.
2. All 39 `pack.json` files name `fits`, `requires`, `tests` (code file to its tests), `concepts`, `folders`, `hooks`, `skillsIn`; 46 hook
   rows carry their own `order`; 123 `choose` mentions became one `fits` list per pack. Evidence: `agents/w7-b-report.md`.
3. Conformance gate: 12 hard checks each red on a plant; a ratchet holds what still fails (from the survey's 266 files, e.g. R1 83, R6 75,
   C6 139) and refuses a rise. Before: no gate. Evidence: `agents/w7-a-report.md`.
4. `new-pack` and `add-lesson-check` scaffold from one template; a scaffolded pack passes the whole gate (5 tests). Evidence: `agents/w7-a-report.md`.
5. Generated by `scripts/counts.mts`: README's five tables, the site's six counts, `docs/rules-without-checks.md`, the `used` column of
   `docs/versions.md`, version lines, the per-version manifest. Five count tests deleted (d-12), replaced by `counts --check` with red
   plants. The hand list of rules without checks had about 70 entries; the generated one about 100. Evidence: `agents/w7-c-report.md`.
6. Literal `npx` kit commands in templates and planner text replaced by `{{kit}}`/`kitCommand`, held by a grep test; `claude-ai-skill` retired. Evidence: `agents/w7-b-report.md`.
7. Content folded: five per-language repeats rules into one base rule; `ui-matches-reference-look` into `page-matches-reference-look`; 17 js-ts
   rules into the template; 9 skill descriptions fixed to "Use when". Gates 76 of 76 at the merge. Evidence: `agents/w7-a-report.md`, `progress.md`.

## W8. What a project pays per tool call, and TypeScript enforced in projects
1. Node processes a Bash call waits on: 7 runners (bandwarp's settings, W0.5(g)) to 1 proxy call; a Write 4 to 1. Evidence:
   `build/evidence/W0/replay-g.md`, `build/evidence/W8/summary.md`.
2. A live Bash event's wall, the kit's own install: 142 ms p50 before KWB-201 (W8's first numbers were a test socket) to 2 to 5 ms;
   Post 2 to 3 ms; the TypeScript runner as one process was 88 to 101 ms. Evidence: `workflow-bugs.md` (KWB-201),
   `build/session2/doctor3.txt`, `build/session2/doctor4.txt`, `agents/kwb201-report.md`.
3. Stop on the replay's 51 Stops: p50 1,880 ms and p95 7,785 ms (W0's replay) to 64 and 90 ms; git-guard at Stop 2,091 to 6 ms.
   Evidence: `build/evidence/W8/summary.md`, `agents/w8-heavy-report.md`.
4. A commit and push call: git-guard 9 git processes and kit-fresh 3 on the event to 0 and 0 in steady state; the first call after a
   ref moved still pays one (139 to 315 ms before the follow-up, 74 to 143 after). Evidence: `agents/commit-cost-report.md`, `build/session2/doctor4.txt`.
5. init plus doctor 38.0 s uncached (34.0 at W0 with fewer packs' selftests) and 0.85 s cached (W0 9.1 s warm); update 1.1 s warm (W0
   4.6 s). Evidence: `build/evidence/W8/summary.md`, `agents/w8-budgets-report.md`.
6. The daemon's memory: 731 MB on a copy of the kit's own install (16 workers) to 320 MB; the pool then 2 warm grown to 8: 95 to 97 MB
   idle (line 100, met), 226 MB at 8 after 1,024 events (line 150, NOT met; d-31, d-35). Evidence: `agents/rss-report.md`, `agents/pool-report.md`.
7. The status line served by the daemon: `hook-proxy status` 6.7 ms p50 over 100 renders on a quiet minute against the TypeScript
   render's 79.5 ms; 41 to 43 ms while four agents' tests loaded the machine. Evidence: `build/evidence/agents/w86-status/w86/status-render.json`, `agents/w86-status-report.md`.
8. The Go sampler: one snapshot about 1 ms CPU steady (6 to 12 ms the first) against `ps` at 27 ms; daemon plus sampler 177 MB after
   1,000 events on a scratch install. Evidence: `agents/w8-sampler-report.md`.

## W8.8. The load governor
1. `load ask` end to end through the Go client: 31 ms p50 over 100 asks (38.5 ms on a later quiet run), against 77 ms for the node
   tool alone and 68 ms for a bare node start. Evidence: `agents/gov-route-report.md`, `build/session2/gate4-reds.txt`.
2. This order's heaviest wave replayed through `governed` (three test runs and a 600 s Go fuzzer): highest 1-minute load 11.95 against
   the ceiling of 13, 0 of 121 samples over it, wall 605 s. Ungoverned, the same kinds of jobs reached load 43 and 47 on 2026-11-12
   (the order's record). Evidence: `build/evidence/W8.8/summary.txt`, `build/evidence/W8.8/load.tsv`.
3. Every case of the Done when red on its plant first: 16 for the governor and `load`, 11 for `governed`, the routing and the pause.
   Evidence: `build/evidence/agents/gov-core/`, `build/evidence/agents/gov-route/`, `agents/gov-core-report.md`.
4. The fuzzer under the governor ran at 2 workers on the efficiency cores: about 12,700 execs a second, against 47,000 at 4 workers
   ungoverned (the cost of the user's load rule). Evidence: `build/evidence/W8.8/fuzz.txt`, `agents/w10b-fuzz-report.md`.

## W9. The release in five minutes (measured without publishing)
Local registry (verdaccio 7.1.0) and a scratch remote; never public npm or GitHub. build/evidence/W9 is not in the main checkout at
drafting time; the numbers are from the agent's report.
1. One-hook release: about 937 s from commit to publish (W0.5(d)) to 22.8 s, 41 times faster. Evidence: `build/evidence/W0/gate-d.log`, `agents/w9-release-report.md`.
2. One-lib 17.0 s (gate 8.4 s); content change 19.5 s (gate 10.9 s). All under 300 s. Evidence: `agents/w9-release-report.md`.
3. Gate inside those releases before the picker fix: 319, 406, 324 s; after: 13.9, 8.4, 10.9 s. KWB-166 was a folder reference in the hook rig
   that made one-hook gates reach about 85 files. Closed. Evidence: `agents/w9-release-report.md`, `workflow-bugs.md` (KWB-166).
4. NOT under 300 s: a core lib every install reads (`lib/configs.mts`) takes 415.2 s (gate 402.4 s). Every `pack.json` (43 files) takes 286.0 s, within bound. Evidence: `agents/w9-release-report.md`.
5. The four proxy builds: 0.28 s warm, 4.1 s with an empty Go cache; skipped when proxy bytes are unchanged. Evidence: `agents/w9-release-report.md`.
6. Three refusal plants red first (red gate, empty CHANGELOG section, changed proxy byte); the 2.0.0 `--dry-run` printed the plan with 0
   refusals and left the tree unchanged. Evidence: `progress.md` (W9), `agents/w9-release-report.md`.

## W10. Before calling it finished
1. Findings: 16 in the code review, 7 in the tests review, 11 CARRY rows and 14 other open rows; every one written in `progress.md`
   with its fix or why it stays, 0 blank. Evidence: `progress.md` (W10 ledger), `review/w10-code.md`, `review/w10-tests.md`, `review/w10-rows.md`.
2. Fixed: code findings 1, 2, 6, 7, 9, 12, 15 whole and 3, 4, 13, 14 in part; rows 115, 133, 135, 137, 174, 177, 178, 182, 186, 187, 194,
   each with its test red first. Evidence: `agents/w10-codefix-report.md`, `agents/w10-codefix2-report.md`, `agents/w10-rowfix-report.md`, `agents/w10-rows2-report.md`.
3. Stays, each tagged deferred with who and why: code findings 5, 8, 10, 11, 16; rows 86, 113, 129, 134, 151, 152, 153, 189.
   Evidence: `progress.md` (W10 ledger), `workflow-bugs.md`.

## W10b. The resident runner and the Go proxy under stress
1. The 60-minute soak, alone, 4 clients on the efficiency cores: 120 samples; 1,420 events compared with the TypeScript runner, 0
   different exit codes and 1 different text (the daemon cut stage-guard at its time limit and git-guard refused the same `git add -A`);
   heap slope 0.01 MB per 10 minutes. Evidence: `build/evidence/W10b/summary.md`, `build/evidence/W10b/differences.jsonl`.
2. NOT met: 29,779 events played, not over 200,000 (the efficiency cores played about 8 a second); RSS 226.9 MB at 8 workers against
   150; descriptors after `kill -9` 127 against 136 at the start (fewer, outside the line's 2); one process left after the stop, the
   agent's own inspector session holding the daemon (a 10-minute run with it closed first stopped clean). d-35. Evidence:
   `build/evidence/W10b/summary.md`, `agents/w10b-soak-report.md`.
3. A leak found and fixed: the first run grew 54 zombie children of the daemon by minute 60 (git-guard's detached refresh from a
   worker thread); the second held at most 1. Evidence: `agents/w10b-soak-report.md`, `test/unit/hooks-lib/child-group-orphan.test.mts`.
4. Fuzzing, 0 crashes and 0 hangs: Go `FuzzReadReply` 10 minutes, 28.27 million execs; the TypeScript wire parser 1.26 million inputs;
   the daemon's socket 1.40 million connections; `go test -race`, `go vet` and `staticcheck` 2026.2.2 clean. Evidence:
   `build/evidence/agents/w10b-fuzz/`, `agents/w10b-fuzz-report.md`.
5. The independent review: 22 findings (3 high, 11 medium, 8 low); 1 to 21 fixed, each with its test red first, and the wire's shared
   constants generated for Go from one table, a second copy red. Evidence: `review/w10b-review.md`, `agents/w10b-owners-report.md`, `agents/w10b-paths-report.md`.

## W11.0. Five bandwarp tasks done again on 2.0
The order's own test of the new kit: real tasks that bandwarp's agents did on 1.9, the same briefs word for word, handed to an agent working
with the 2.0 kit in a fresh clone (bandwarp itself never written to). One run per task is a sample, not a proof. Full tables and the
file-by-file diff reading: `docs/workorders/typescript/ab.md`.
1. What ran: macdsp (Opus both times), looks, settings, presets and developer (Sonnet both times), drawn by seed 20261112, one after another, alone,
   through the governor at priority 0.3. The first five runs used the kit as packed on 2026-11-12, before the fixes for KWB-215 (making-check)
   and KWB-216 (a judge past its deadline). Looks was run a second time on the fixed kit, as the order requires for a task that comes out worse.
   Evidence: `docs/workorders/typescript/ab.md`, `build/evidence/W11/ab-pick.md`, `build/evidence/W11/ab-prep.md`.
2. Five-task totals, originals against the new runs (looks counted as its second run): turns 987 to 877 (0.89); tokens out 691,571 to 707,279
   (1.02); cached reads 121,193,982 to 233,726,278 (1.93, nearly twice, macdsp alone is 94 of the 234 million); cache writes 4,045,010 to
   2,439,882 (0.60); wall 10,043 s to 9,978 s (0.99); hook waiting 98 s to 17 s (0.17, by the transcript's own measure); refusals 53 to 57 and
   retries 50 to 57. The new runs' own kit logs add 85 refusals, 11 end-of-turn send-backs, 51 events "not judged (over time)" and 252 s inside
   hooks by the event log. The sums mix Opus and Sonnet and are for scale only. Evidence: `docs/workorders/typescript/ab.md`, `build/evidence/W11/ab.md`.
3. Per task, original against new run, gates by name: macdsp 7 of 7 equal, turns 246 to 337, wall 1,839 s to 3,009 s, hook waiting 23 s to 2 s
   (worse on cost; the new run's builds ran about four times slower at priority 0.3, WB-210); settings 8 gates measured and green against none
   measured in the original, turns 242 to 171, wall 2,155 s to 1,594 s, hook waiting 24 s to 5 s (diff worse on scope: fewer settings take
   effect); presets the two brief gates equal, turns 154 to 119, wall 2,010 s to 2,705 s, refusals 10 to 15; developer 4 of 4 equal, turns 143 to
   127, wall 1,692 s to 1,432 s, hook waiting 10 s to 5 s. Evidence: `docs/workorders/typescript/ab.md`, `build/evidence/W11/gates/macdsp.txt`.
4. **Looks did not meet the order's line "0 tasks where 2.0 failed a gate the original passed".** The original passed all 5 of its gates; the new
   run passes 2 of 5 in both runs. The three dark-theme gates (`look_panel_graphite`, `look_panel_deep`, `look_panel_night`) stay red on their
   depth rows. The original pooled the four sides of a card and held one named row out (its d-112 to d-114); both 2.0 runs kept the per-side
   measure and left the rows red. The second run, on the fixed kit, had 1 send-back and 3 repair turns (the first had 4 and 25), geometry and
   colour clean on every dark theme, every plant seen, the looks declared; turns 202 to 123, wall 2,347 s to 1,230 s. No hook is shown to have
   caused the shortfall, so this is not counted as passed. Evidence: `docs/workorders/typescript/ab.md`, `build/evidence/W11/gates/looks.txt`.
5. Looks, third and fourth runs (the overseeing session, after KWB-217 added the depth rules): the third read and used the new rules and all four
   look reports passed, but by holding out 14 rows on DEEP, 5 on GRAPHITE and 5 on NIGHT against the original's 1, so the look gate now refuses a
   held-out row without its limit and more than 2 rows (heldOutMax). The fourth run (kit 45dc055): WARM passes; the three dark looks honestly fail
   with no row held out and the missing tokens named, and the gates against the original stay 2 of 5. The decision is the user's: add the named
   tokens to bandwarp's themes (a design change on the PC side) or accept the dark depth rows open. Evidence: `progress.md`, `build/evidence/W11/ab/looks3/`, `build/evidence/W11/ab/looks4/`.
6. What the kit cost these runs: making-check sent a turn back 14 times in the first five runs (macdsp 5, looks 4, settings 3, presets 1, developer
   1), 57 repair turns of 860, 6 percent (KWB-215, fixed on the branch before the second looks run). KWB-216, "not judged (over time)", showed 49
   times in the four governed runs that have a crash log (before the fix). Both are fixed and logged. Evidence: `docs/workorders/typescript/ab.md`, `workflow-bugs.md`.
7. What it does not show: five tasks, one run each (looks several), on a kit fixed twice partway through, from originals that were resumed and
   run beside other agents, cannot say 2.0 is better or worse than 1.9. It shows the new kit did the same work in the same size of effort on four
   of five tasks and that the fifth differed in every run. Evidence: `docs/workorders/typescript/ab.md`, `decisions.md` (d-34).

## W11.1. The after, in rows
Everything below is measured on this Mac in W11.1 by the same command W0 used (or the same thing end to end where the command changed),
with the load average beside it in `docs/workorders/typescript/after.md`. Sums are over the played events, never a median times a count.
1. Gates: no-find 188.3 s to 12.9 s (2 of 372 test files, before 5 of 87); git-guard 326.6 s to 57.2 s; `lib/layout` 19.0 s to 59.6 s (13 of 372
   files, a miss: the picker now reaches the 14.6 s worktree test and repo-lint). Inside a release the one-hook gate is 20.3 s. Evidence:
   `build/evidence/W11/baseline-measured-run1.md`, `build/evidence/W11/gate-b1.log`, `build/evidence/W11/gate-c.log`, `build/evidence/W11/measured-hook.json`.
2. The release on a local registry (verdaccio, a scratch remote, never npm or GitHub): one-hook change 29.5 s (gate 20.3, generators 3.5,
   publish 3.5, proxy 0.4), one-lib 22.5 s, content 30.8 s; W0 937 s. `npm run release major --dry-run` plans 1.8.2 to 2.0.0 with 0 refusals in
   1.67 s. Not run: the push, the publish and the GitHub release for real. Evidence: `build/evidence/W11/release-measure-hook.txt`, `build/evidence/W11/release-dry-run.txt`.
3. init, update, doctor: cache empty 34.0 s to 39.7 s (a miss), cache warm 9.1 s to 1.95 s, `update` 4.6 s to 1.14 s, `doctor --fresh` 29.8 s to
   38.5 s (a miss). The cold numbers grew with more hooks, more selftests, and the proxy and daemon selftests. Evidence: `build/evidence/W11/retake/baseline-measured.md`.
4. The replay, played in full, 5,583 events from bandwarp's log (153 prompts, 124 Stops, 2,747 tool calls), by the 1.9.0 tree, the 2.0 runner
   and the 2.0 proxy: summed hook wait 1,647.4 s, 692.3 s, 214.6 s; mean per event 295.1 ms, 124.0 ms, 38.4 ms; per prompt 10.77 s, 4.52 s,
   1.40 s; per tool call 482.9 ms, 238.2 ms, 69.8 ms; hook CPU 1,737.1 s, 585.1 s, 147.0 s (61.1 s in the clients and 85.9 s in the daemon; 11.8x less from the 1.9.0 tree to the proxy).
   Evidence: `build/evidence/W11/replay-v19.md`, `build/evidence/W11/replay-runner.md`, `build/evidence/W11/replay-proxy.md`.
5. Node processes started over the same events: 21,384 under 1.9 (summed from the fixture's runner lines), 10,888 with the TypeScript runner
   (counted with a `node` shim on PATH), 5,305 with the proxy (4.0x fewer than 1.9; derived: only the async heartbeat starts one; the shim bypassed the daemon, so
   it is not a count). Evidence: `build/evidence/W11/node-starts.md`, `build/evidence/W11/replay-proxy.md`.
6. Hook waiting per feature task, bandwarp's 38 agents and 14,588 events filed by the worktree each worked in, each kind of call times the real
   mean wall of that kind: 2,740.8 s on the 1.9 replay, 528.2 s with the proxy (5.2x), 1,789.5 s with the runner alone (1.5x). By task: settings
   408.9 s to 76.6 s, macdsp 389.2 s to 75.8 s, looks 305.3 s to 59.8 s. The 1.9 runner's own logged milliseconds (714.6 s) are not wall times
   and give only 1.4x; they are not used as the before. Evidence: `build/evidence/W11/agent-task-wait.md`, `build/evidence/W11/agent-task-wait.json`.
7. One scripted feature task (a knob added to a planted panel and a gain changed in a planted DSP block: prompt, 2 Reads, grep, ls, 2 Edits,
   `git diff --stat`, `git status`, `git add`, `git commit`, Stop; 22 hook calls; 7 runs each, 0 refusals): hook wait median 2,662 ms on the
   1.9.0 tree, 1,111 ms with the proxy (2.4x), 2,587 ms with the runner alone, which is not faster than 1.9. Evidence:
   `build/evidence/W11/feature-task-v19.json`, `build/evidence/W11/feature-task-proxy.json`, `build/evidence/W11/feature-task-runner.json`.
8. A Bash call's hooks live, through the kit's own install (60 calls, the `sh` picker to the Go client to the daemon): 28.9 ms p50 wall to wall
   (min 25.7, p95 about 43.9); the daemon's own proxy line in hooks.log reads 7 ms p50 over 274 calls; 9 ms of the 28.9 is the cost of starting any
   `sh` here. The status line, 40 live renders: 26.6 ms p50, 0.010 s CPU a render, 0.6 s CPU a minute at refreshInterval 1. Evidence:
   `build/evidence/W11/live-main-install.txt`, `build/evidence/W11/retake/baseline-measured.md`.
9. The daemon's RSS on a scratch install of bandwarp's pack set, `ps` against the daemon's own count: idle at 2 workers 89 MB (58 MB); after 1,000
   events with 8 workers 180 MB (139 MB, over the 150 MB line by `ps`); with 16 clients, pool capped at 8, 180 MB; 150 s later 96 MB. The kit's
   own live daemon, up four hours: 169.6 MB. Evidence: `build/evidence/W11/daemon-rss-8.md`, `build/evidence/W11/daemon-rss-16.md`.
10. tsc and the package: `npm run build` 0.5 s warm and 0.43 s cold (W0 had no build); npm pack 6.95 MB packed, 17.2 MB unpacked, 1,150 files,
    of which the four proxy binaries and one more file are 14.8 MB; without them 3.27 MB unpacked (the order's lines of 4 MB and 16 MB hold).
    Evidence: `build/evidence/W11/tsc-cold.txt`, `build/evidence/W11/pack-parts.txt`.
11. Release gate on the tip: red at the time of measuring on one repo-lint test ("no file names a person", a home path in
    `docs/workorders/typescript/agents/kwb216-report.md`); the release measurement set that path aside in its scratch clone only. Found by the
    measurement; line 17 of that report no longer holds the path. Evidence: `build/evidence/W11/release-run1/`, `docs/workorders/typescript/agents/w11-measure-report.md`.

## M. Targets missed or worse than before
Decision d-36: each is stated beside its line and not tuned at the end; further tuning is a 2.0.1 item. Every other number in this report beat its line.
1. Row (c), the one-lib gate: 19.0 s to 59.6 s (3.1x slower). The picker reaches 13 test files where W0's reached 2. Evidence: `build/evidence/W11/gate-c.log`.
2. Cold `init` plus `doctor`: 34.0 s to 39.7 s; `doctor --fresh` 29.8 s to 38.5 s. More hooks and selftests; W8's line of under 40 s holds by 0.3 s. Evidence: `build/evidence/W11/retake/baseline-measured.md`.
3. The TypeScript runner alone for one Bash event: 90 ms to 123 ms (the `sh` picker runs first and base has more hooks). With the Go client: 38 ms. Evidence: `build/evidence/W11/retake/baseline-measured.md`.
4. The prompt event: 47 ms to 77 ms p50. `reuse-hint` does 46 ms of its own work. Against the 1.9.0 tree on the same replay (128 ms) it is faster. Evidence: `build/evidence/W11/replay-proxy.md`.
5. Live Bash wall to wall: 28.9 ms against W8's reopened line of 20 ms. By the daemon's proxy line, the measure the line was written in, it is 7 ms and holds. Evidence: `build/evidence/W11/live-main-install.txt`.
6. The status line render live: 26.6 ms against W8's 15 ms (about 17 ms without the `sh` start). Evidence: `build/evidence/W11/live-main-install.txt`.
7. The daemon's RSS at 8 workers after 1,000 events: 180 MB by `ps` against 150 MB (139 MB by the daemon's own count); the soak read 226.9 MB at load 15. Idle (89 MB) and at 16 clients (180 MB) hold. Evidence: `build/evidence/W11/daemon-rss-8.md`, `build/evidence/W10b/summary.md`.
8. npm pack: 0.84 MB to 6.95 MB packed. The four proxy binaries are 14.8 MB of the 17.2 MB unpacked. The order's lines hold. Evidence: `build/evidence/W11/pack-parts.txt`.
9. The TypeScript runner alone gives no gain on the scripted feature task: 2,587 ms against 2,662 ms on 1.9. The speedup is the proxy's. Evidence: `build/evidence/W11/feature-task-runner.json`.
10. The 60-minute soak played 29,779 events, not over 200,000 (the efficiency cores played about 8 a second). Evidence: `build/evidence/W10b/summary.md`.
11. Looks (W11.0): 2 of 5 gates against the original's 5 of 5, in every run. Evidence: `docs/workorders/typescript/ab.md`.
12. W5's wall: 753 s (637 tests) to a median of 982 s (1,326 tests); the 180 s target is not met. Evidence: `build/evidence/W5/summary.md`.

## What was converted
Tracked tree at f2a518e and at 9ca2f8f. The "after" includes later work (daemon, governor, Go client), so it is not a pure conversion count.

| folder | before | after |
|---|---|---|
| `bin` | 1 `.mjs`, 254 lines | 1 `.mts`, 9 lines (commands moved into `lib`) |
| `lib` | 45 `.mjs`, 3,087 | 60 `.mts`, 5,174 |
| `packs` (code) | 134 `.mjs`, 12,920, and 2 `.py`, 273 | 233 `.mts`, 22,058, 0 `.py` |
| of which `packs/base/hooks/lib` | 60 `.mjs`, 5,150, 1 `.py`, 77 | 116 `.mts`, 9,964 |
| `test` | 92 `.mjs`, 8,403 (87 `.test.mjs`) | 400 `.mts`, 21,142 (366 `.test.mts`) |
| `scripts` | 3 `.mjs`, 440 | 30 `.mts`, 2,778 |
| `global` | 4 `.mjs`, 496 | 8 `.mts`, 587 |
| `proxy` (Go, new) | none | 24 files, 2,274 |

## O. The owners made and the copies removed
1. Copies left in every counted kind: 0 (git runners 22 to 1, payload parses 22 to 0, hook tails 33 to 0, `isMain` 11 to 0, heredoc
   cutting 8 to one owner). Evidence: `build/evidence/W4/copies.md`.
2. Owners made at W2 and W3: `files.mts`, `git-run.mts`, `hash.mts` (nine short hashes), `source-exts.mts` (extension lists in five readers),
   `json.mts` as a leaf, `verdict.mts`, `projectRoot()` in `hook-log` (31 hooks), `escapeRegExp` in `glob.mts`. Evidence: `progress.md`, `agents/w3-root-report.md`.
3. Three `real` helpers: two became one; `dup`'s differs for a missing path and stays as `realPath` built on `project`'s, both results pinned
   by a test (KWB-180, d-22). Evidence: `workflow-bugs.md`, `decisions.md` (d-22).
4. Raw JSON-call ratchet 550 to 279 at W4; `readJson`, `parseJson`, `toJson`, `writeJson` own the rest. Evidence: `build/evidence/W4/suite-vs-baseline.md`, `survey/repeats.md` section 4.
5. Test preludes: 34 of 92 test files had their own 7 to 10 lines (20 clone pairs, 165 lines); fixtures and the shared helper own them,
   `init` sites 61 to 38. Evidence: `survey/repeats.md` section 1, `build/evidence/W5/summary.md`.
6. Five per-language repeats rules became one; the 20 import-header "clones" the detector reported (KWB-176) are 0 now it leaves imports out. Evidence: `agents/w7-a-report.md`, `workflow-bugs.md`.
7. Hand copies still left: none in the counted kinds (row 1). The pack-content ratchet still holds files that fail C5, R1 or R7 and need a person
   (W10 tests#4), and about 30 exported types have no importer (W10 code#13, harmless). Evidence: `agents/w10-testfix-report.md`, `progress.md`.

## The bugs typing found
Found while converting, or while writing the first unit tests of a converted file; each fixed with its test red first.

| KWB | found at | what | fix and test |
|---|---|---|---|
| 170 | W1.3 | `template-law` read an emitted `.mjs` beside its `.mts` as a copy | emitted twins left out; `build/evidence/W2/kwb170-red.txt` |
| 172 | W2.10 | `kit-lock` imported a half-moved lib and crashed every call (8 refused) | imports the installed, emitted lib |
| 174 | W3, typing `crash-policy` | the one-hour hold list never aged: a crashed call stayed "held" (unjudged) past the hour | age vs `HOLD_MS`; `crash-policy.test.mts` |
| 176 | W3 | `once-only`'s detector counted identical import lines as a copy | imports ignored; `dup.test.mts` |
| 177 | W3, typing `program-writes` | `add()` returned a record even for an unresolved path | returns none; `program-writes.test.mts` |
| 178 | W3, `hook-log` slice | the blanker read a backtick in a regex literal as a template string and blanked the rest of the file | `regexAt`/`regexEnd`; `cpp-scan` test |
| 180 | W3 | two `real` helpers differ for a missing path | decided; `real-paths.test.mts` |
| 183 | W4 | `making-check` read an emitted twin as a copy | `isOwnSource`; selftest case |
| 186 | W5 share (a) | `functionsOf` never found a block-bodied arrow function | `headOf` takes `=>` |
| 187 | W5 share (a) | `repo-index` read an `@generated` file as hand-written | pattern fixed; `repo-index.test.mts` |
| 198 | W8.5 | the TypeScript laws never reached `.mts`/`.cts` | `withModuleForms` in `glob.mts` |

Also found by the steps: KWB-168 and 169 (W0), 171 (W1), 173, 175, 179 (31 emitted `.mjs` committed; now held by gate 3b), 185. Evidence: `workflow-bugs.md`, `progress.md`.
No fault that changed a hook's verdict on a real event was found by `tsc` alone; the faults that mattered were in readers and holds nothing tested before. W11.1 adds W10's.

## K. What the kit did well and badly
From `node bin/claude-packs.mjs logs` in the main checkout (read only) at the end of the order: 61,278 hook calls, 2026-11-11 09:02Z to
2026-11-13 09:19Z. They move as the order runs. The 8 wrong refusals and the open count are the evidence for what follows.
1. Refusals: 331. 222 right, 8 wrong, 101 still open. By hook: `template-law` 91, `git-guard` 87, `code-shape` 55, `once-only` 45, `no-find` 17,
   `no-polling` 16, `kit-lock` 4, `file-size-guard` 4, `placement-law` 3, others 1 to 2. Evidence: `docs/workorders/typescript/agents/w11-report-report.md` (the table as read).
2. Wrong, 8: `template-law` 4, and one each from `no-polling`, `untrusted-boundary`, `kit-fresh`, `making-check`. The W11.0 runs add false reads
   their agents marked (shape-law reading "20 dB" as preset 20, template-law reading same-named functions in different files as a copy), not yet
   in the kit's own log. Evidence: `docs/workorders/typescript/ab.md`.
3. Well: `template-law` (65 right of 91) and `once-only` (38 right of 45) refused copies agents made as they moved code, which the "copies left: 0"
   rests on. `git-guard` 87 refusals, 52 right, 0 wrong. `code-shape` 39 right, 0 wrong. `file-size-guard` 4 of 4 right. Evidence: `docs/workorders/typescript/agents/w11-report-report.md`.
4. Well: the checks that were planted red caught what they should; every Done when line has its plant seen red first (W2 row 3, W8.8 row 3, W10b row 5).
   Evidence: `build/evidence/W2/gates-6-10-red.txt`, `build/evidence/agents/gov-core/`.
5. Badly: 101 refusals left open against the rule that every refusal is judged (`git-guard` 35, `template-law` 22, `code-shape` 16, `no-polling` 14), up from 66
   a day earlier. The process is late, not wrong. Evidence: `docs/workorders/typescript/agents/w11-report-report.md`.
6. Badly: 159 crash records: `once-only` 37, `kit-lock` 32 (the half-moved lib of KWB-172), `template-law` 27, `no-find` 8, `suite-once` 8, `secrets-guard` 6.
   Each refuses one call once and says so, which is the policy, but each cost an agent a turn. Evidence: `docs/workorders/typescript/agents/w11-report-report.md`.
7. Badly: `making-check` sent turns back 14 times in the five A/B runs, 57 repair turns of 860 (KWB-215), and `no-polling` was wrong 1 of 16 and open 14. Evidence: `docs/workorders/typescript/ab.md`.

## P. What is proved and how
1. The conversion: 0 type errors on every converted file under strict `tsc` 7.0.2 (3,742 before), `npm run check` over sources and tests, twelve
   repo-lint gates each seen red on a plant. Evidence: `build/evidence/W2/gates-6-10-red.txt`, `findings.md`.
2. Behaviour kept: every baseline test name present or mapped (12 not present by name, each accounted for), 1,326 of 1,326 green at suite-4 and
   suite-5, a planted deletion shown as gone. Evidence: `build/evidence/W5/names-baseline.txt`, `build/evidence/W5/suite-5.txt`.
3. The runner and the Go proxy agree: the 60-minute soak compared 1,420 events with the TypeScript runner, 0 different exit codes and 1 different
   text; fuzzed 28.27 million Go execs, 1.26 million wire inputs and 1.40 million socket connections with 0 crashes and 0 hangs. Evidence:
   `build/evidence/W10b/summary.md`, `agents/w10b-fuzz-report.md`.
4. The speed numbers above are measured, live where a user feels them, summed over real events, with the 1.9.0 tree played by the same method.
   Evidence: `build/evidence/W11/replay-proxy.md`, `build/evidence/W11/replay-v19.md`.
5. The release path: gated, bumped, published to a local registry, tagged and released in 22.5 to 30.8 s on a scratch remote, three refusal plants red
   first, the 2.0.0 `--dry-run` with 0 refusals. Evidence: `build/evidence/W11/release-measure.txt`, `build/evidence/W11/release-dry-run.txt`.
6. The same briefs on the new kit: four of five tasks lost no gate (W11.0 above). The fifth did not hold.

## N. What is not done
1. The whole suite does not exit 0 inside its own load: five timing tests pass alone and fail beside the suite's other files (d-37), and the 180 s line is missed. Evidence: `build/session4/suite3.txt`.
2. Not proved: Windows natively (the kit runs on Windows through WSL only), the proxy under WSL, on a shared Linux box and on a macOS older than Go's
   minimum; Node 22.0 to 22.17 (none installed); npm's one-time-password prompt, a person's step outside every timed release. Evidence: `docs/workorders/typescript/workorder.md`.
3. Language servers other than TypeScript's; the CARRY rows marked deferred in W10 (KWB-153, 152, 151, 113); code findings 5, 8, 10, 11, 16. Evidence: `progress.md`.
4. Not measured: 1.9.0 as a published package (it was never on npm; "1.9.0" is `git archive 905e6be`); the release's push, publish and GitHub release for real; a
   release on another machine. Evidence: `docs/workorders/typescript/after.md`.
5. The targets in section M, and the looks task (M-11), wait for the user or a 2.0.1.
6. A 200,000-event soak at 8 clients on the performance cores; the user forbade it under the load rule. Evidence: `decisions.md` (d-35).

## F. The user's first actions after 2.0.0
1. In bandwarp (and each project on the kit): `npx --no-install @thedecipherist/claude-packs update`. It rebuilds only the kit's own hooks in
   `settings.json`: older per-hook entries migrate to one blocking entry per event, the project's own hooks stay, and `refreshInterval` for the
   status line is set to 1. Evidence: `agents/w8-runner-report.md`, `agents/w86-status-report.md`.
2. Then `doctor --strict`. It names "hook path: the proxy" or "the TypeScript runner" and runs the binary's own selftest. Evidence: `agents/w8-proxy-report.md`.
3. The Go binary for the machine is copied once into the user's cache (`~/Library/Caches/claude-packs/` on macOS, `~/.cache/claude-packs/` on Linux
   and under WSL) and shared by every project; a machine with no binary for its system uses the TypeScript runner through the same `sh` picker.
   Evidence: `agents/w8-proxy-report.md`, `docs/workorders/typescript/workorder.md`.
4. On the PC, run the same `update` under WSL, the first place the proxy meets WSL; nothing here proves it (section N). Evidence: `docs/workorders/typescript/workorder.md`.
5. Decide the looks question (M-11): add the named tokens to bandwarp's themes, or accept the dark depth rows open. Evidence: `docs/workorders/typescript/ab.md`, `progress.md`.
6. Mark the 101 open refusals right or wrong (`logs refusals --open`), and read the 8 wrong ones before the next hook change. Evidence: `docs/workorders/typescript/agents/w11-report-report.md`.
