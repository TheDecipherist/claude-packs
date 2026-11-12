# The TypeScript order: before and after

Internal report, W11 item 2. Plain words. Drafted 2026-11-12 with the sections whose numbers are final (W0 to W7, W9). W8, W10, W10b,
the comparison table and W11's own rows are headings marked `pending: W11.1`.

How to read it. Every row ends with the file it comes from. `build/evidence/...` lives only in the main checkout of the machine that ran
the order (ignored by git); `docs/workorders/typescript/...` is tracked. "Before" is the tree at the baseline commit f2a518e (the first
commit plus W0.1 to W0.4 and W0.6, no code converted: d-14) unless a row says otherwise. A number that got worse is written as worse.

## The comparison table
pending: W11.1 (W0.5's twelve rows, before, after, the ratio, from `build/evidence/W11/after.md` and `numbers.json`).

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
1. Hand-written `.mjs` in `packs/base/hooks/lib`: 60 files, 5,150 lines at the baseline; 0 at the end of W3 (`house.py` the one named
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
   deletion shows as gone. Evidence: `build/evidence/W5/names-baseline.txt`, `names-now.txt`, `allowed-gone.txt`.
3. Red tests: 7 before, 0 at suite-4 and suite-5 (1,326 of 1,326). Evidence: `build/evidence/W5/summary.md`, `suite-4.txt`, `suite-5.txt`.
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
4. `doctor --fresh` 29.8 s to 31.3 and 31.9 s: no change, under the 60 s bound. Evidence: `build/evidence/W0/baseline-measured.md`, `build/evidence/W6/6-doctor-fresh-1.txt`, `6-doctor-fresh-2.txt`.
5. `npm pack` 0.84 MB / 1,021 files to 0.98 MB / 1,058 files, 0 `.mts`, `.d.mts`, `.tsbuildinfo`, `.map`; fresh install under Node 22.23.3 passes
   `doctor --strict`; `tsc -b` warm 0.29 s. Evidence: `build/evidence/W6/3-pack.txt`, `install.txt`, `6-tsc-warm.txt`.
6. Kit's own install: `update --dir .` exit 0, `doctor --strict` 0 problems. `LSP` from a child session: `readJson` 98 references in 43
   files, `writesOf` 15 callers, `sync` 38 outgoing calls. Evidence: `build/evidence/W6/2-update.txt`, `2-doctor-strict.txt`, `5-lsp.txt`.
7. The three hook-gate reds in the timed runs are the noop test's, by design (a touched hook is an installed file whose manifest line
   `node scripts/counts.mts` writes in the same commit). Evidence: `build/evidence/W6/summary.md`.

## W7. Packs from one template, and the hand-kept facts generated
No `build/evidence/W7/` exists; numbers are in the three agent reports and `progress.md`.
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
pending: W11.1 (`build/evidence/W8/summary.md` once the order closes the step).

## W8.8. The load governor
pending: W11.1

## W9. The release in five minutes (measured without publishing)
Local registry (verdaccio 7.1.0) and a scratch remote; never public npm or GitHub. `build/evidence/W9/` is not in the main checkout at
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
pending: W11.1

## W10b. The resident runner and the Go proxy under stress
pending: W11.1

## W11. The report, with the comparison
pending: W11.1

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

## The owners made and the copies removed
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
7. Hand copies still left: listed under "what is not done" (W11.1).

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

## What the kit did well and badly
From `node bin/claude-packs.mjs logs` in the main checkout (read only), 56,565 hook calls, 2026-11-11 09:02Z to 2026-11-12 21:55Z. They move as the order runs; W11.1 re-reads.
1. Refusals: 295. 221 right, 8 wrong, 66 still open. By hook: `template-law` 88, `git-guard` 78, `code-shape` 46, `once-only` 44, `no-find` 17, `no-polling` 6, `file-size-guard` 4, `placement-law` 3, others 1 to 2.
2. Wrong, 8: `template-law` 4, and one each from `no-polling`, `untrusted-boundary`, `kit-fresh`, `making-check`.
3. Well: `template-law` (65 right of 88) and `once-only` (38 right of 44) refused copies agents made as they moved code, which the "copies left: 0" rests on.
   `git-guard` 78 refusals, 52 right, 0 wrong. `file-size-guard` 4 of 4 right.
4. Badly: 66 refusals left open against the rule that every refusal is judged (`git-guard` 26, `template-law` 19). The process is late, not wrong.
5. Badly: 125 crash records: `kit-lock` 32 (the half-moved lib of KWB-172), `once-only` 28, `template-law` 17, `suite-once` 8, `no-find` 8. Each refuses one call once and says so,
   which is the policy, but each cost an agent a turn.
