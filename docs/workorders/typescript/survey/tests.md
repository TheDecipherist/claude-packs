# Survey: the kit's tests (read-only, branch work/2.0.0-typescript)

Scope: `test/` holds 87 `*.test.mjs` files and 5 helpers (`kit-cli.mjs`, `worktree-rig.mjs`, `worktree-cases-commands.mjs`, `worktree-cases-packs.mjs`, `fresh-tmp.mjs`), 8,403 lines, and `test/fixtures/` (21 files, 260 KB: `fixtures/noop/{stellix,sub37,full-stack}/{before,expected}/*` = 20 files, plus `fixtures/mpx-shape-refusals.json`). 548 `test(` calls become 620 runs (loops: `holdsEachCase` in `test/kit-cli.mjs` makes 27). Nothing was run for this survey. All timings come from two logs and carry the caveats in section 0.

## 0. How to read the numbers (caveats first)

- Suite log `~/projects/claude-packs-notes/.mac-suite-1.log` (kit 1.8.1): 620 tests, 598 pass, 22 fail, wall 1,579 s. Sum of per-test seconds 24,169 s, so average concurrency 15.3 on a 18-core Mac (`sysctl hw.ncpu`). Seconds are contended wall time, not CPU.
- Gate log `.../scratchpad/gate-1.9.0-4.txt` (kit 1.9.0): `test:changed` chose 86 of 86 test files, ran 429 s wall (`duration_ms 428714`), 456 pass, 22 fail, plus 14 files cancelled at the end (`house`, `kf-fail-open`, `kf-refusals`, `review-packs`, `routes`, `rule-tests`, `rust-pack`, `structure`, `sub37-wb`, `ui-craft`, `ui-depth`, `workorder-check`, `worktrees`, `writing`: "Promise resolution is still pending"). So the gate log has 464 timed tests, sum 4,157 s, concurrency 9.7, and no times for those 14 files.
- The gate picked 86 of 86 because the branch changed 62 files (all of base's hooks, `lib/doctor.mjs`, a configuration, `test/fresh-tmp.mjs`), and `TABLE` in `scripts/test-changed.mjs` sends any `packs/` change to `noop`, any hook change to `worktrees`, and `test/fresh-tmp.mjs` to every test. It is a release gate, not a one-hook gate.
- Per-test seconds are inflated by contention (the first `midi:` case took 255.9 s in the suite and 19.9 s in the gate; the same kind of test takes 11 to 23 s after it). Use ratios, and the gate numbers (median 0.51 s, p90 27.7 s) over the suite numbers (median 10.1 s, p90 151.6 s).
- Matching log lines to files: my script matched each log name to a `test('...')` literal or template in `test/*.test.mjs` (619 of 620 matched; `holdsEachCase` names assigned to `audio-packs` and `review-packs`). The scripts live in the session scratchpad, not in the repo.

## 1. Where the time goes

### 1.1 The 20 slowest tests (suite log, seconds)

| s | file | test |
|---|---|---|
| 420.3 | doctor-cache | a failing selftest is never remembered, and --fresh runs them all |
| 402.1 | doctor-cache | a second doctor runs no selftest whose hook has not changed ... |
| 393.7 | hover | an installed synth gets the rule and the skill; full-stack gets its rule loaded |
| 389.6 | base-laws | a new project of every configuration gets both laws, and both selftests pass |
| 383.3 | house | the house hooks install where they belong, project-neutral, and pass their selftests |
| 338.2 | other-projects | no hook of this project blocks an edit in another project |
| 317.2 | kf-new-projects | KF-1: doctor is red when the queue is gone ... |
| 299.2 | configs | init --config stores the configuration, update applies it, doctor prints it |
| 292.8 | micro | stage-guard is on by default and off in the Stellix profile |
| 285.9 | doctor-timeout | a selftest that hangs is reported as timed out |
| 278.3 | hook-timing | every installed hook writes one timing line per call |
| 277.8 | configurations | synth-creator: installs into a fresh repo and doctor --strict passes |
| 273.2 | install-block | the plugin template's own block installs with init --from, and doctor --strict is green |
| 271.3 | gitignore | an install ignores .claude/usage.log and .claude/hooks.log |
| 270.8 | kf-refusals | KF-10: a dry run stages nothing, in both hooks |
| 266.6 | hook-proof | a clean install is green; a hook no settings entry runs is red |
| 264.1 | kf-fail-open | KF-18: a config regex param-id-lock cannot compile is reported by name ... |
| 263.1 | core-budget | the queue runs a command with its share ... |
| 261.4 | house | a copy tree is read-only by its kind ... |
| 261.1 | routes | folder-law refuses a new source file outside the layout by every route ... |

Every one of the 20 is an install-then-doctor test. Gate log top 5 (seconds): hover 110.2 (doctor: UI code and no hover gate), shape 106.1 (doctor fails a synth with no manifest), kf-new-projects 80.1 (KF-1), other-projects 71.4, custom-packs 69.7. The gate's 174 tests of 10 s or more sum 4,025 s of 4,157 s (96.8%); its 249 tests under 1 s sum under 60 s.

### 1.2 Summed seconds per test file (top 15)

| rank | suite file | s (tests) | gate file | s (tests) |
|---|---|---|---|---|
| 1 | house | 1,456 (11) | kf-new-projects | 236 (18) |
| 2 | kf-fail-open | 1,057 (20) | configurations | 235 (11) |
| 3 | kf-refusals | 1,007 (27) | hover | 225 (8) |
| 4 | audio-packs | 893 (17) | audio-packs | 215 (17) |
| 5 | doctor-cache | 822 (2) | install | 209 (9) |
| 6 | install | 747 (9) | lookup | 204 (12) |
| 7 | configurations | 744 (11) | configs | 173 (8) |
| 8 | hover | 729 (8) | shape | 172 (5) |
| 9 | kf-new-projects | 698 (18) | custom-packs | 162 (4) |
| 10 | configs | 672 (8) | install-block | 157 (8) |
| 11 | lookup | 660 (12) | other-projects | 139 (3) |
| 12 | micro | 627 (5) | hook-proof | 136 (4) |
| 13 | install-block | 604 (8) | postgres-pack | 131 (8) |
| 14 | review-packs | 547 (22) | cpp-pack | 125 (7) |
| 15 | cpp-pack | 545 (7) | rules-follow-the-code | 122 (6) |

Inside a file tests run one after another; files run side by side (18 cores). So wall is bounded by the longest file: the suite's 1,579 s wall is `house.test.mjs` at 1,456 s plus start-up, and in the gate `house` was still running when the run was cut at 429 s. House has 11 tests and 14 `init` + 13 `update` + 5 `doctor` call sites (`test/house.test.mjs`, 303 lines). Splitting it, or sharing its installs, lowers wall time more than any other single change.

### 1.3 Tests that run init, update, new or doctor

Static call sites (a scan of `'init'|'update'|'new'|'doctor'|'update-all'` as CLI arguments in `test/*.mjs`, git's own `init` excluded): init 161, update 42, new 13, update-all 1, doctor 81, in 60 files. 56 files are install tests. Every `init`, `update`, `new`, `add` and `--auto` ends in `doctor(dir, console.log, INSTALLING)` (`bin/claude-packs.mjs`, symbol `INSTALLING`), so each is an install plus a doctor: 217 static installs-with-doctor plus 81 explicit doctors = 298 doctor passes, before loops. Loops add: `holdsEachCase` (`test/kit-cli.mjs`) is one call site in `audio-packs` and one in `review-packs` but 12 + 15 = 27 installs; `configurations.test.mjs`, `base-laws.test.mjs` and `hook-proof.test.mjs` loop over every configuration.

Time share: install-test files take 24,089 s of the suite's 24,169 s (99.7%) and 4,122 s of the gate's 4,157 s (99.2%). The 23 files that do not install (a, b-minus-installers, e kinds) take 79 s suite / 34 s gate. One install plus two hook runs (a `holdsEachCase` test) costs a median 14.0 s in the gate (12 tests, min 13.3, max 19.9) and 15.9 s in the suite (27 tests, min 11.1).

Per file, sites as init/update/new/doctor, top 12 by installs: house 14/13/0/5; lookup 13/1/0/1; install-block 6/0/4/2; install 9/5/0/1; configs 8/2/0/3; structure 8/2/0/3; rust-pack 7/0/0/1; micro 6/0/0/1; review-packs 6/0/0/0 (+15 loop); rules-follow-the-code 6/2/0/1; content-sites 4/1/0/0; every-language 4/0/0/0. The last column group of the table in section 6 lists all 87 files.

## 2. The kinds of test

Heuristic: spawn of `bin/claude-packs.mjs` with init/update/new = (c); `worktree-rig.mjs` = (d); imports `../lib|packs|scripts` with no install, or a tool/hook run on a hand-built scratch folder = (a) or (b); reads the repo's own files = (e). Counts add to 87. Suite seconds in brackets.

| kind | files | tests | suite s | files |
|---|---|---|---|---|
| (a) pure unit, imports one module, no spawn | 7 | 29 | 2 | example-line, fresh-tmp, json-helper, layout-owned, release, run-claudes, run-remotes |
| (b) hook, tool or command fired on a scratch folder, no install | 11 | 70 | 151 | fix-plan, global, kit-lock, lock-release, look-report-merge, planner, quiet-test, run-status, source-ledger, statusline, test-changed |
| (c) a whole install, then doctor or a hook | 56 | 419 | 23,751 | audio-packs, base-laws, configs, configurations, content-sites, core-budget, cpp-pack, custom-packs, doctor-cache, doctor-timeout, every-language, full-stack, gitignore, hook-proof, hook-timing, house, hover, install-block, install-fixes, install, instances, kf-build-laws, kf-fail-open, kf-new-projects, kf-refusals, kit-guards, logging, lookup, micro, names-sweep, new, noop, once-only, other-projects, postgres-pack, prove-a-bank, review-packs, route-table, routes, rule-tests, rules-follow-the-code, rust-dry, rust-pack, scan, shape, stored-text, structure, sub37-wb, symmetry, ui-craft, ui-depth, vst3host, what-the-kit-finds, workorder-check, workorder, writing |
| (d) a git worktree scenario | 2 | 6 | 257 | worktrees, worktree-twins (rig `test/worktree-rig.mjs`, cases `test/worktree-cases-*.mjs`) |
| (e) a reader of the repo | 11 | 24 | 3 | base-neutral, check-speed, file-size, file-urls, frame-bench, json-ratchet, no-personal-name, npx-name, pack-manifest, readme, site |

Notes: (b) is the cheap, honest kind: 70 tests in 151 s suite (2.2 s each), 57 s gate. Most (c) tests do not need an install to prove their subject: `kf-refusals`, `kf-fail-open`, `lookup`, `every-language`, `rust-pack`, `review-packs`, `names-sweep` import or fire one hook or tool (kf-refusals: 27 tests, 1 `init`; kf-fail-open: 20 tests, 2 `init`) and spend 70 to 95% of their time on one shared install plus doctor each `test()` re-creates. The kinds are not exclusive: `scan.test.mjs` copies a project and installs inside the command; `statusline` also edits a settings file by install.

## 3. Tests that exist only to hold a hand-maintained number

| test | what is held by hand | what would make it unnecessary |
|---|---|---|
| `test/readme.test.mjs` ("every pack has its row, with its true counts") | per pack, 4 count cells in the README table (rules, checks, hooks, skills), the configuration and preset rows | generate the table between markers from `packs/*/pack.json` and the folders (as `claude-packs:start` blocks are generated); the test shrinks to "the generated block equals the file", one `--check` call |
| `test/site.test.mjs` | `data-count="packs|rules|checks|hooks|skills|configurations"` in `site/index.html` | emit the six numbers from one `counts.json` generated at release; the page reads it (or the build writes the attributes) |
| `test/noop.test.mjs` (150 lines, 21.6 KB, 37 `const` lists such as `CHANGED`, `REVIEWED`, `V7`, `TIME`, `WRITING`, `FAIL_OPEN`) | which installed files differ from the 0.9.15 baseline, each with a version comment | derive from the manifest: every installed file carries `since:` and `changed:` in its pack's file table (`pack.json`), so the diff against `fixtures/noop/*/expected/lock.json` is computed and the lists are deleted; or drop the lists and compare lock hashes against the previous release's lock (a release artefact) |
| `test/json-ratchet.test.mjs` (`RAW_CALLS_LEFT = 547`, edited in the commit that lowers it) | the count of raw `JSON.parse/stringify` calls | a lint rule that forbids new ones (`git diff` added lines only), or the 2.0 typed `json` module with the raw calls banned by the compiler; the cap file disappears |
| `test/file-size.test.mjs` | 300 lines for installed files, duplicating `layout.maxFileLines` (also read by the installed `file-size-guard` hook) | read the limit from `.claude/layout.json`; better, run `file-size-guard`'s selftest, which already plants an over-long file; keep the test for kit sources only if the kit's own layout has a limit |
| `test/worktrees.test.mjs` (`CASES` merged with `PACK_CASES` and `COMMAND_CASES`; "every installed hook needs a worktree case") | a list of 45 hook names, each with one case | the hook exports its own `worktreeCase` beside `selftest`; the test iterates the manifest, so a new hook with no case fails by construction and the three lists go away |
| `test/kf-refusals.test.mjs` (`FIXTURE.refusals ... 14` wrong, `... 15` right) | verdict counts of `test/fixtures/mpx-shape-refusals.json` | assert on the fixture's own rows (each must be refused or passed), not on totals |
| `test/names-sweep.test.mjs` (`r.missing.length, 2000`) | the planted-noise count | compare to the generator's own number |
| `test/base-neutral.test.mjs` ("what left base ..." `moved` list of 15 paths) | files that moved out of base in 0.10.0 | a one-time migration check that has done its job; delete the list, keep "base names no synth word" |
| `test/npx-name.test.mjs`, `test/file-urls.test.mjs`, `test/no-personal-name.test.mjs` | regexes over every file (`SKIP` set, `LEFT_OUT`) | one repo-lint pass (3 regexes, one tree walk) as a pre-commit tool, not three tests that each walk `packs lib bin global scripts prompts` or `git ls-files` |

Total: 10 rows above. The (e) ones are cheap (3 s suite for all 11 files); the costly ones are `noop` (529 s suite) and `worktrees` (257 s suite). A new hook touches, by hand: the README row, the `site/index.html` count, `noop`'s lists and `CASES` (`TABLE` in `scripts/test-changed.mjs` routes a `packs/` change to `noop`, the `true counts` tests and the worktree test for that reason).

## 4. The install-per-test problem

Static scan of init argument lists (`'init' ...` up to the closing paren, `--dir` tails removed): 161 init sites in 52 distinct argument sets: 36 literal sets (139 sites) and 16 dynamic rows (22 sites: `...packs`, `--config config`, `pack, ...initArgs`, `--from order`). Most built:

| init arguments | sites | files |
|---|---|---|
| `audio-core` | 40 | 17 |
| `--config base` | 17 | 13 |
| `--auto` | 11 | 5 |
| `js-ts` | 10 | 3 |
| `audio-core gpu-painter` | 8 | 4 |
| `audio-core gpu-painter stellix --profile stellix` | 6 | 5 |
| `--config cpp` | 6 | 1 |
| `next-app` | 4 | 2 |
| `reverse-engineering --config cpp` | 3 | 2 |
| `--config full-stack` (+ `FLEET`, + `stored-text`) | 5 | 4 |
| no arguments | 3 | 3 |
| the other 25 literal sets | 1 to 2 each | 1 each |
| `holdsEachCase` loops (`--config synth-creator` + one pack per case) | 27 runs | 2 |

Collapsed to the base they start from, these are about 14 configurations: `base`, `audio-core`, `audio-core+gpu-painter`, the Stellix profile, `synth-creator`, `cpp`, `js-ts`/`node`, `next-app`, `full-stack`, `go`+`multi-tenant`, `python`+`shell`, `http-api` family, `rust`, `--auto`. Each is built 3 to 40 times a run, and 25 of the 36 literal sets are built once or twice.

Estimate of the saving with one cached install per configuration, built once per run and copied into each test's folder:
- Cost of one install plus doctor: 14.0 s (gate median of 12 `holdsEachCase` tests, which do one `init` and two hook runs).
- Installs per run: at least the 174 gate tests of 10 s or more (4,025 s). Using 14 s each gives 2,436 s of install and doctor time, 59% of the gate's 4,157 s. The rest of those tests is hook runs and further doctors.
- Cost with a fixture: 14 fixtures x 14 s = 196 s built once, plus a copy per test. `packs/` is 2,924 KB (base 952 KB, audio-core 388 KB), so a copy is under 1 MB of small files; assume 0.3 s (not measured here). 174 x 0.3 = 52 s.
- Saving: 2,436 - (196 + 52) = about 2,190 s of summed gate time (53%). Divided by the observed concurrency 9.7 that is about 225 s of the 429 s wall, and wall would then be set by the longest remaining file, not by installs.
- `holdsEachCase` alone: 27 installs x 14 s = 378 s summed become one install of all packs (14 s) plus 27 hook-pair runs (about 0.2 s each): saves about 360 s.
- Doctor: after the fixture, a test that needs `doctor` output (81 explicit doctor sites) can read one stored doctor result per fixture; the 3 slowest doctor tests (`doctor-cache` 822 s, `doctor-timeout` 286 s, `hook-proof` 267 s in the suite) are about doctor itself and must keep their own installs (that is 3 files, about 8 installs).

Where to build: `test/fresh-tmp.mjs` is the per-process preload and already shares one memory across processes by environment (`CLAUDE_PACKS_SELFTEST_CACHE ??=`); the same hand-off (`CLAUDE_PACKS_FIXTURES ??=`, a build lock by atomic `mkdir`) lets the first file that asks for a configuration build it and the others wait.

## 5. Repetition in tests

| prelude | copies | files | belongs in |
|---|---|---|---|
| `CLI`/`KIT` constants redeclared | 24 files | doctor-timeout, file-urls, gitignore, house, hook-timing, global, install, json-ratchet, instances, lock-release, kit-guards, micro, new, once-only, other-projects, npx-name, routes, shape, symmetry, structure, sub37-wb, test-changed, + kit-cli, worktree-rig | `kit-cli.mjs` already exports `KIT`, `CLI`; delete the 22 copies |
| own `run`/`cli` wrapper over `spawnSync/execFileSync('node',[CLI,...])` | 13 files | global, hook-timing, house, install, lock-release, micro, other-projects, once-only, quiet-test, source-ledger, shape, structure, symmetry | `kit-cli.mjs` `run`, `cli` (same bodies) |
| `put(dir|file, text)` write-with-mkdir | 11 copies, 3 signatures | `(dir, rel, text)`: content-sites, kf-refusals, kf-new-projects, rule-tests, scan, structure (inner); `(file, text)`: once-only, routes, shape, sub37-wb, worktree-rig (exported), run-claudes (default text) | one `put` in `kit-cli.mjs` (`projectWith` already builds a tree from `{path: text}`) |
| `git` helper | 10 copies, 6 identity variants (`user.email=t@t`, `t@l`, `t@e.c`, `t@local`; `stdio` ignore/pipe; `-C`) | custom-packs, kit-lock, kf-refusals, new (inner), postgres-pack (inner), run-status (inner), sub37-wb, test-changed, worktree-twins, worktree-rig | `kit-cli.mjs` `git(dir, ...a)`, one identity |
| `project()` scratch-folder builder | 17 local builders | configs, fix-plan, install, instances, kit-lock, lock-release, logging, once-only, postgres-pack, prove-a-bank, routes, run-claudes, rules-follow-the-code, run-status, scan, source-ledger, what-the-kit-finds, workorder-check | split: a fixture install (section 4) and `projectWith(files)` (exists) |
| hook fired as Claude Code fires it (`hook`/`fire` over `spawnSync(node,[.claude/hooks/x])` with `CLAUDE_PROJECT_DIR`) | 13 files | doctor-cache, hook-timing, house, install, kit-lock, lock-release, kit-guards, logging, lookup, micro, other-projects, sub37-wb, structure | `kit-cli.mjs` `hookRun` already exists (the `.py` branch in house and worktree-rig `fireAs` is the only difference); merge `fireAs` into it |
| tool-call payload `{ tool_name: 'Write', tool_input: { file_path, content } }` | 35 files build it by hand | e.g. every-language, micro (5), structure (7), worktrees (4) | `kit-cli.mjs` `write(path, content)` / `bash(command)` payload builders (worktree-rig has `fire`, `bash`) |
| transcript (`.jsonl`) writers | 7 files | hook-timing, kf-refusals (`transcript`, `line`), statusline, worktrees, worktree-twins, worktree-cases-commands, worktree-cases-packs | `kit-cli.mjs` `transcript(dir, turns)` |
| commit with identity in a scratch repo | 11 files | custom-packs, kf-refusals, kf-fail-open, kit-lock, look-report-merge, postgres-pack, scan, test-changed, worktree-cases-commands, worktree-rig, worktree-twins | the `git` helper above |
| layout.json rewritten by hand with `guards`/`folders` | 8 files (30 test files mention `layout.json`) | audio-packs, core-budget, kf-fail-open, kf-refusals, layout-owned, logging, worktrees, worktree-cases-packs | `kit-cli.mjs` `withLayout(dir, patch)` (`withGuards` in `test/worktree-cases-packs.mjs` is a private one) |

Test-side duplication is the cause of the picker's blind spot: `scripts/test-changed.mjs` lists `INSTALLING_HELPERS = ['bin/claude-packs.mjs', './kit-cli.mjs', './worktree-rig.mjs']` to know a test installs, so every new helper or private `run` has to be known there.

## 6. Mapping a change to its tests

How the map is made today (`scripts/test-changed.mjs`): a test covers a file it imports (to 2 hops, never through the hub `bin/claude-packs.mjs`), a file whose basename it quotes (`namesIt`: basename longer than 5 characters, in quotes), and the `TABLE` rows (`packs/` to `noop`; hook added/removed to `worktrees`; `lib/x.mjs` to tests named `test/x[.-]*`). Below, "subject" is the modules a test names (path literal, basename or import; `bin` and `json.mjs` left out), measured by my scan. Columns: kind, tests, install sites init/update/new/doctor, suite s, gate s (0 = cancelled or not run in the gate).

| test file | k | n | i/u/n/d | suite s | gate s | subject modules (named) |
|---|---|---|---|---|---|---|
| house | c | 11 | 14/13/0/5 | 1456 | 0 | lib/settings.mjs,git-guard,run-hooks,browser-guard,build-guard,idle-wake,+3 |
| kf-fail-open | c | 20 | 2/1/0/7 | 1057 | 0 | param-id-lock,folder-law,git-guard,lesson-checks,selftest,writes,+2 |
| kf-refusals | c | 27 | 1/0/0/1 | 1007 | 0 | code-shape,dispatch-once,git-guard,code-shapes,languages,turn,+5 |
| audio-packs | c | 5 | 3/0/0/0 | 893 | 215 | repo-litter,firmware-out-of-git |
| doctor-cache | c | 3 | 2/0/0/2 | 822 | 57 | folder-law,glob |
| install | c | 9 | 9/5/0/1 | 747 | 209 | (CLI only) |
| configurations | c | 4 | 2/0/0/1 | 744 | 235 | (CLI only) |
| hover | c | 8 | 1/1/0/8 | 729 | 225 | (CLI only) |
| kf-new-projects | c | 18 | 1/0/0/5 | 698 | 236 | build-guard,buildq |
| configs | c | 8 | 8/2/0/3 | 672 | 173 | (CLI only) |
| lookup | c | 12 | 13/1/0/1 | 660 | 204 | dispatch-once,lesson-checks |
| micro | c | 5 | 6/0/0/1 | 627 | 101 | stage-guard |
| install-block | c | 6 | 6/0/4/2 | 604 | 157 | user-asks |
| review-packs | c | 7 | 6/0/0/0 | 547 | 0 | cpp-scan,secrets-guard,stack-guard,schemas-only |
| cpp-pack | c | 7 | 2/1/0/1 | 545 | 125 | template-law |
| other-projects | c | 3 | 2/0/0/0 | 537 | 139 | git-guard,browser-guard,spec-lock,freeze |
| noop | c | 3 | 0/1/0/0 | 529 | 56 | lib/layout.mjs,lib/shape.mjs,shell-writes,settings-standard,smoothing-checks,param-id-lock,+72 |
| routes | c | 18 | 1/0/0/0 | 510 | 0 | lib/global.mjs,shell-writes,version-pin-guard,param-id-lock,realtime-guard,brief-guard,+15 |
| new | c | 2 | 0/0/3/0 | 482 | 29 | (CLI only) |
| rule-tests | c | 8 | 2/0/0/3 | 481 | 0 | lib/rule-tests.mjs |
| base-laws | c | 2 | 2/2/0/0 | 446 | 83 | secrets-guard,untrusted-boundary |
| shape | c | 5 | 3/1/1/7 | 420 | 172 | brief-guard,shape-law |
| custom-packs | c | 4 | 1/2/0/1 | 390 | 162 | lesson-checks |
| kit-guards | c | 3 | 2/2/0/1 | 385 | 40 | git-guard,run-hooks,build-sweep,idle-wake,user-asks |
| structure | c | 8 | 8/2/0/3 | 384 | 0 | param-id-lock,folder-law,placement-law,protect-vendor |
| logging | c | 6 | 1/0/0/0 | 371 | 86 | file-size-guard,event-log,secret-patterns,run-hooks,secrets-guard |
| sub37-wb | c | 5 | 1/1/0/3 | 368 | 0 | lib/coverage.mjs,version-pin-guard,git-guard,protect-vendor |
| postgres-pack | c | 8 | 2/1/1/1 | 357 | 131 | db-wipe-guard |
| hook-proof | c | 4 | 1/0/0/6 | 354 | 136 | (CLI only) |
| hook-timing | c | 5 | 1/0/0/1 | 354 | 86 | lib/packs.mjs,hook-log,run-hooks,browser-guard,idle-wake |
| rust-pack | c | 19 | 7/0/0/1 | 335 | 0 | folder-law,languages |
| instances | c | 6 | 1/0/0/0 | 331 | 98 | shape-law |
| full-stack | c | 3 | 2/0/0/3 | 311 | 95 | realtime-guard,placement-law,secrets-guard,untrusted-boundary,stack-guard,build-guard,+2 |
| content-sites | c | 7 | 4/1/0/0 | 303 | 77 | content,repo-litter,secrets-guard |
| doctor-timeout | c | 1 | 1/0/0/1 | 286 | 33 | (CLI only) |
| every-language | c | 8 | 4/0/0/0 | 273 | 62 | lesson-checks,code-shapes,languages,near-copies |
| rules-follow-the-code | c | 6 | 6/2/0/1 | 272 | 122 | folder-law |
| gitignore | c | 1 | 1/0/0/0 | 271 | 20 | (CLI only) |
| core-budget | c | 7 | 1/0/0/0 | 263 | 20 | core-budget,quiet-test,buildq |
| worktrees | d | 5 | 0/1/0/0 | 257 | 0 | param-id-lock,realtime-guard,brief-guard,code-shape,dispatch-once,file-size-guard,+20 |
| route-table | c | 6 | 1/0/0/0 | 255 | 16 | route-judge,route-mermaid,route-plants,route-table |
| ui-depth | c | 8 | 2/0/0/0 | 251 | 0 | page-measure |
| once-only | c | 3 | 1/0/0/2 | 239 | 58 | making-check,making,once-only |
| ui-craft | c | 4 | 4/0/0/5 | 238 | 0 | (CLI only) |
| names-sweep | c | 23 | 2/0/0/0 | 228 | 35 | unwrap,names-sweep |
| writing | c | 4 | 2/0/0/1 | 222 | 0 | lesson-checks |
| what-the-kit-finds | c | 10 | 3/2/0/0 | 220 | 83 | lib/repo-weight.mjs,lesson-checks,secret-patterns,names-sweep |
| stored-text | c | 3 | 2/0/0/0 | 187 | 70 | lesson-checks |
| install-fixes | c | 6 | 3/0/2/0 | 183 | 41 | lib/kit-lock.mjs,git-guard,shape-law |
| rust-dry | c | 7 | 1/0/0/0 | 183 | 70 | dispatch-once,near-copies,rust-scan,template-law |
| kf-build-laws | c | 5 | 1/0/0/0 | 177 | 14 | lib/rule-tests.mjs |
| symmetry | c | 8 | 1/0/0/1 | 171 | 53 | shape-symmetry |
| vst3host | c | 7 | 1/0/0/0 | 135 | 15 | (CLI only) |
| workorder | c | 18 | 0/0/2/0 | 118 | 23 | lib/new.mjs,event-log,hook-log |
| workorder-check | c | 6 | 2/0/0/0 | 99 | 0 | (CLI only) |
| lock-release | b | 8 | 0/0/0/0 | 41 | 13 | lib/kit-lock.mjs |
| look-report-merge | b | 2 | 0/0/0/0 | 26 | 4 | selftest,look-gate |
| global | b | 5 | 0/0/0/2 | 24 | 9 | gnu-shell,shell-writes,shell-traps,version-pin-guard,command-prefix,program-read,+4 |
| kit-lock | b | 4 | 1/0/0/0 | 24 | 11 | lib/kit-lock.mjs |
| scan | c | 5 | 0/0/0/0 | 20 | 12 | (CLI only) |
| run-status | b | 10 | 0/0/0/0 | 14 | 5 | lib/run-status.mjs,lib/status-cli.mjs,run-status |
| fix-plan | b | 3 | 0/0/0/0 | 8 | 4 | lib/fix-plan.mjs |
| test-changed | b | 6 | 0/0/0/0 | 7 | 8 | lib/doctor.mjs,lib/kit-lock.mjs,test-changed,no-find,shape-symmetry |
| prove-a-bank | c | 4 | 1/0/0/0 | 4 | 7 | wav,prove-a-bank |
| quiet-test | b | 7 | 0/0/0/0 | 4 | 1 | quiet-test |
| pack-manifest | e | 3 | 0/0/0/0 | 2 | 0 | lib/pack-manifest.mjs,lib/packs.mjs |
| planner | b | 10 | 0/0/0/0 | 2 | 1 | lib/planner.mjs |
| run-remotes | a | 8 | 0/0/0/0 | 2 | 4 | lib/run-status.mjs,lib/status-cli.mjs,run-remotes,run-status,statusline-runs |
| readme | e | 6 | 0/0/0/0 | 1 | 0 | lib/packs.mjs |
| source-ledger | b | 5 | 0/0/0/0 | 1 | 1 | source-ledger |
| base-neutral | e | 2 | 0/0/0/0 | 0 | 0 | realtime-checks,build-guard,build-sweep,frozen-files,idle-wake,protect-vendor,+5 |
| check-speed | e | 1 | 0/0/0/0 | 0 | 0 | (CLI only) |
| example-line | a | 2 | 0/0/0/0 | 0 | 0 | lib/shape.mjs,shape |
| file-size | e | 1 | 0/0/0/0 | 0 | 0 | lib/shape.mjs,shape |
| file-urls | e | 1 | 0/0/0/0 | 0 | 0 | (CLI only) |
| frame-bench | e | 1 | 0/0/0/0 | 0 | 0 | (CLI only) |
| fresh-tmp | a | 3 | 0/0/0/0 | 0 | 0 | (CLI only) |
| json-helper | a | 5 | 0/0/0/0 | 0 | 0 | (CLI only) |
| json-ratchet | e | 1 | 0/0/0/0 | 0 | 0 | languages |
| layout-owned | a | 2 | 0/0/0/0 | 0 | 0 | lib/layout.mjs,layout |
| no-personal-name | e | 1 | 0/0/0/0 | 0 | 0 | lib/settings.mjs |
| npx-name | e | 3 | 0/0/0/0 | 0 | 0 | (CLI only) |
| release | a | 4 | 0/0/0/0 | 0 | 0 | release |
| run-claudes | a | 5 | 0/0/0/0 | 0 | 0 | run-claudes |
| site | e | 4 | 0/0/0/0 | 0 | 0 | (CLI only) |
| statusline | b | 10 | 0/0/0/0 | 0 | 0 | lib/settings.mjs,statusline-runs,statusline-work,statusline |
| worktree-twins | d | 1 | 0/0/0/0 | 0 | 16 | making-check |

### 6.1 The inverse: source files no test is about

Source set: 189 `.mjs`/`.py` files (`lib/` 45, `bin/` 1, `scripts/` 3, `global/` 4, `packs/**` 136: base hooks 26, base hooks/lib 61, base tools 9, 20 elsewhere in packs, 16 in pack tools). "Named" = a test quotes its basename or imports it, not counting the cross-cutting `noop`, `worktrees`, `worktree-cases-*`, `base-neutral`, which list files by name for other reasons. By that count 86 of 189 are named by no test, 46 by exactly one, 57 by two or more.

| group | files | named by no test | named by one | by two or more |
|---|---|---|---|---|
| `lib/` | 45 | 28 | 10 | 7 |
| `packs/base/hooks/lib/` | 61 | 36 | 12 | 13 |
| `packs/base/hooks/` | 26 | 6 | 5 | 15 |
| `packs/base/tools/` | 9 | 4 | 2 | 3 |
| other packs (hooks, hooks/lib, tools), `global`, `scripts`, `bin` | 48 | 12 | 17 | 19 |

Named by no test: `lib/` backup, build-queue, claude-md, config-cli, configs, custom-packs, found-folders, git-tokens, hook-proof, hook-timing, hover-gate, install-block, kit-command, logs, manifest, once-only-report, repeats, rules, scan-detect, scan, shape-cli, suggest, switches, symmetry-doctor, sync, workorder-check, workorder, zip. The picker's name rule (`test/<module>[.-]*` for `lib/<module>.mjs`) covers 20 of the 45 by file name (for example `configs`, `custom-packs`, `scan`, `workorder-check`), but those are install tests: the module is exercised, not unit-tested. Truly without a same-named test: backup, build-queue, claude-md, config-cli, found-folders, git-tokens, hover-gate, kit-command, logs, manifest, once-only-report, repeats, scan-detect, suggest, switches, symmetry-doctor, sync, zip (18, among them `sync.mjs`, the installer's core). Base hooks named by only `noop` and `worktrees`: agents-held, heartbeat, inside-the-project, kit-fresh, reuse-hint, skill-first. Others: `packs/audio-core/hooks/lib` (3 of 3), `packs/audio-core/tools/tone-report.mjs`, `packs/sound-design/tools/bank-measures.mjs`, `packs/reverse-engineering/tools/multi-find.mjs`, `packs/cpp/hooks/compile-cache.mjs`, `scripts/changed-functions.mjs`, base `hooks/lib` modules `crash-policy`, `unread-writes`, `shape-lists`, `kit-version`, `run-discovery`, `run-transcripts`, `run-tree`, `hub-rig`, `apply-edit`, `build-slots`, `trunk-lag`, `statusline-paint`, `statusline-session`, `test-verdict`.

Touched only incidentally by 10 or more test files (through an install, never named): every file an install copies is reached by 56 install-kind files; those with no test of their own are the 6 base hooks above, the 36 unnamed base `hooks/lib` modules, `lib/sync.mjs`, `lib/switches.mjs`, `lib/claude-md.mjs`, `lib/manifest.mjs`, `lib/backup.mjs` (the install path every `init`, `update` and `new` runs: 56 files, 217 static installs). `lib/doctor.mjs`, `lib/settings.mjs` and `lib/packs.mjs` are named by 2 to 4 tests and reached by all 56. `bin/claude-packs.mjs` is quoted by 22. A change to any of them is "covered" by every install test through the table row, which is why a change to base selects a large part of the suite.

Base hooks: base's hooks are copied by each install (not checked per configuration here), so one change to a base hook reaches all 56 install tests by installation, and only the quoting tests (git-guard 9 files, lesson-checks 11, folder-law 8, secrets-guard 7, shape-law 7, run-hooks 7) are about it.

## 7. A proposed layout that makes the mapping exact and cheap

Rule: a source file's tests live at a path computed from its own path, so "what tests this change?" is a path function (no scan of imports, quotes, and a table). Three tiers; counts are targets from the survey, not promises.

| tier | path | what | files (today to proposed) |
|---|---|---|---|
| U unit | `test/unit/lib/<x>.test.mts` mirrors `lib/<x>.mts`; `test/unit/hooks-lib/<x>.test.mts` mirrors `packs/<pack>/hooks/lib/<x>.mts` | one module, imports it, no spawn, no install (kind a) | 7 today to about 75: 45 `lib/` modules (18 have none) plus about 30 of the 65 hook libs with logic of their own; the other hook libs are tested through the hook that owns them, by the hook test |
| H hook | `test/hooks/<pack>/<hook>.test.mts` mirrors `packs/<pack>/hooks/<hook>.mts` | runs the hook's own `--selftest` (all 45 hooks have one), its worktree case (exported by the hook; replaces `CASES`, `PACK_CASES`, `COMMAND_CASES`) and its refusals fired on a copy of the base fixture | 0 today to 45; takes about 150 tests that today sit in `kf-refusals` (27), `kf-fail-open` (20), `lookup` (12), `routes` (18), `structure` (8), `micro` (5), `logging` (6), `instances` (6), `shape` (5), `once-only` (3), `every-language`, `rust-dry`, `rust-pack` (19), `cpp-pack` (7), `content-sites` (7), `review-packs` (22), `audio-packs` (17), `sub37-wb`, `other-projects`, `kit-guards`, `install-fixes`; and `test/tools/<pack>/<tool>.test.mts` for the 25 tools (names-sweep, prove-a-bank, route-table, quiet-test, source-ledger, symmetry, statusline, page-measure...) |
| I integration | `test/integration/<flow>.test.mts`, few and named for a flow | install, update, noop, doctor, new, scan, workorder, global, release, worktrees, hook-proof, hook-timing, configurations, other-projects, custom-packs, kit-lock, test-changed: each runs a real install on purpose | 56 install-kind files to about 18 |
| R repo | `test/repo-lint.test.mts` (one tree walk) | the 11 (e) files: personal name, bare npx, `file://` URL form, synth word in base, file size, JSON ratchet, README/site/noop checked against generated artefacts | 11 to 1 (plus a `--check` on the generators) |

Fixtures: `test/fixtures/installs/<name>/` is not stored; `test/fixtures/installs.mts` builds each named configuration once per run (about 14: `base`, `audio-core`, `audio-core+gpu-painter`, `stellix-profile`, `synth-creator`, `cpp`, `js-ts`, `next-app`, `full-stack`, `go+multi-tenant`, `python+shell`, `http-api-family`, `rust`, `auto`), by the same env hand-off `test/fresh-tmp.mjs` uses for the selftest cache, and `fixture(name)` returns a copy. The 20 files under `test/fixtures/noop/` stay, as the seed for one noop test.

What moves where, with counts (today 87 test files and 5 helpers, 548 tests):
- Delete or fold: 11 (e) files into `repo-lint` (1); 3 hand-held number files (`readme`, `site`, `noop` lists) become checks of generated artefacts; `file-size`, `json-ratchet`, `npx-name`, `file-urls`, `no-personal-name` become lint rules.
- (c) 56 install files: about 38 re-home as hook (45 target files) or tool tests on a fixture copy, 18 remain as integration tests that really install. Their 161 init sites fall to about 14 fixture builds plus about 30 deliberate installs in the integration tier; `holdsEachCase` (27) becomes one all-packs fixture.
- Helpers: `test/kit-cli.mjs` gains `put`, `git`, `transcript`, `write/bash` payloads, `withLayout`, `fixture(name)`, and `hookRun` takes the `.py` branch; the 22 redeclared `CLI`/`KIT`, 13 `run`/`cli`, 11 `put`, 10 `git` copies go. `worktree-rig.mjs` stays only for the worktree integration test and builds its repo from the `stellix-profile` fixture (copy, then `git init`).
- The picker (`scripts/test-changed.mjs`) shrinks to a path function: `lib/x` to `test/unit/lib/x`; `packs/p/hooks/h` to `test/hooks/p/h` plus the worktree case; `packs/p/hooks/lib/m` to its unit test plus the hook tests of its importers; a fixture builder or `fresh-tmp` change to the integration tier. The `TABLE` rows for `noop`, counts and `CASES` disappear because those become generated or per-hook.

Expected gate time, from the timing data above (unmeasured parts are marked):
- One-hook change, `git-guard` today: 9 files picked (house, install-fixes, kf-fail-open, kf-refusals, kit-guards, noop, other-projects, sub37-wb, worktrees). Gate seconds 276 summed over the files that finished, longest finished file 139 s, three of the files (house, kf-fail-open, kf-refusals) not finished in the gate; suite seconds 5,780 summed, longest file 1,456 s. Proposed: the hook's `--selftest` (assumed 1 to 2 s), its 10 to 15 refusal tests on a fixture copy (tests under 1 s are 249 of 464 in the gate, median 0.51 s), one `base` fixture build (14 s, once), the worktree case (one `stellix-profile` fixture, 14 s once, plus git), the generated-artefact check (about 1 s). Cold cache about 35 to 45 s wall, warm about 10 to 15 s, against 139 s to 1,456 s today.
- Lib-module change, `lib/layout.mjs` today: `layout-owned` plus `noop` (529 s suite, 56 s gate). Proposed: `test/unit/lib/layout.test.mts` (under 1 s, no spawn) plus the update integration test on 2 fixtures (2 x 14 s once, parallel): about 15 to 20 s. `lib/doctor.mjs` today: `doctor-cache` and `doctor-timeout` (suite 822 s and 286 s, gate 57 s and 33 s): proposed doctor unit tests on 3 fixture copies (doctor is most of the 14 s install cost; the split is not in the logs), about 20 to 45 s wall in parallel.
- Full gate (all of 86): sum 4,157 s on 9.7x concurrency came to 429 s with 14 files cut off. With 14 fixtures built once (196 s summed, parallel) and about 174 installs reduced to copies, the summed time falls by about 2,190 s (section 4), so a full run is expected near 200 s wall. The floor is then the longest remaining file; keep every file under about 60 s summed so it never again equals the wall (today `house` 1,456 s, 92% of the suite wall).
- Risks to prove before the move: copying an install must keep absolute paths valid (`.claude/claude-packs.lock.json` and settings entries use the project dir: `fixture()` must rewrite them or install with a stable relative form); some tests change the install (they take a fresh copy); doctor's selftest cache is keyed by hook hash, so copies share it.
