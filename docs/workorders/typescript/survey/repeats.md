# Survey: what the kit repeats (the kit's own readers, run on the kit)

Branch work/2.0.0-typescript, measured 2026-11-11. Nothing in the repo was changed except this file. Raw output is in
`<session scratchpad>/repeats/`: dup-scan.txt, dup-pairs.txt, scan-report.md, claude-packs-scan.json, scan-by-check.txt, scan-stdout.txt, repeats-raw.txt, run-repeats.mjs,
selftest-handrolled.txt (and mts/, the probe for part 5). The kit has 279 .mjs files and 25,594 lines under packs, test, lib, scripts, global, bin.

## 1. Duplicate scan (`dup scan --dir .`, jscpd, 284 sources, 50 tokens / 6 lines minimum)

The scan found 20 clone pairs in 15 files, 165 duplicated lines in all. Every one is in test/ and every one is the head of a test file: the
imports plus the `CLI` / `project` / `tmp` prelude. No clone is in lib/, scripts/ or any hook: the hooks' repeats are shorter than the
detector's floor, so parts 2 and 3 are where they show. There are fewer than 25 pairs, so the list below is all of them, largest first.

| # | one side | other side | lines | tokens |
|---|---|---|---|---|
| 1 | test/instances.test.mjs:2-11 | test/micro.test.mjs:2-11 | 10 | 76 |
| 2 | test/instances.test.mjs:2-11 | test/structure.test.mjs:3-12 | 10 | 76 |
| 3 | test/instances.test.mjs:2-11 | test/symmetry.test.mjs:4-13 | 10 | 76 |
| 4 | test/once-only.test.mjs:3-12 | test/routes.test.mjs:4-13 | 10 | 76 |
| 5 | test/kit-lock.test.mjs:4-12 | test/lock-release.test.mjs:4-12 | 9 | 60 |
| 6 | test/micro.test.mjs:5-12 | test/structure.test.mjs:6-13 | 8 | 80 |
| 7 | test/global.test.mjs:4-11 | test/install.test.mjs:4-11 | 8 | 62 |
| 8 | test/global.test.mjs:4-11 | test/other-projects.test.mjs:5-12 | 8 | 60 |
| 9 | test/global.test.mjs:4-11 | test/lock-release.test.mjs:6-13 | 8 | 57 |
| 10 | test/install.test.mjs:4-11 | test/micro.test.mjs:4-11 | 8 | 55 |
| 11 | test/install.test.mjs:4-11 | test/structure.test.mjs:5-12 | 8 | 55 |
| 12 | test/once-only.test.mjs:5-12 | test/shape.test.mjs:5-12 | 8 | 55 |
| 13 | test/doctor-timeout.test.mjs:5-12 | test/gitignore.test.mjs:4-12 | 8 | 52 |
| 14 | test/install.test.mjs:4-11 | test/other-projects.test.mjs:5-12 | 8 | 52 |
| 15 | test/global.test.mjs:4-11 | test/instances.test.mjs:4-11 | 8 | 50 |
| 16 | test/global.test.mjs:4-11 | test/new.test.mjs:5-12 | 8 | 50 |
| 17 | test/doctor-timeout.test.mjs:5-11 | test/global.test.mjs:4-10 | 7 | 52 |
| 18 | test/doctor-timeout.test.mjs:5-11 | test/instances.test.mjs:4-10 | 7 | 52 |
| 19 | test/doctor-timeout.test.mjs:5-11 | test/lock-release.test.mjs:6-12 | 7 | 52 |
| 20 | test/doctor-timeout.test.mjs:5-11 | test/new.test.mjs:5-11 | 7 | 50 |

Files involved most (pairs touching the file): test/global.test.mjs 6, test/instances.test.mjs 5, test/doctor-timeout.test.mjs 5,
test/install.test.mjs 4, test/micro.test.mjs 3, test/structure.test.mjs 3, test/lock-release.test.mjs 3, then eight files with 1 or 2.

What the 20 pairs say: 58 of 92 test files already import test/kit-cli.mjs (it exports `assert`, `test`, `KIT`, `CLI`, `run`, `cli`, `fresh`,
`projectWith`, `hookRun`, `selftest`). The other 34 each open with their own 7 to 10 lines. The fix is to move them onto kit-cli (part 4, row 10).

## 2. The kit's own laws on the kit (`scan --dir .`)

The scan read 1197 files on a copy (165 not read: secrets, symlinks, over 1 MB), installed the base, writing, hook-proof, shell, web, ui-craft and
reverse-engineering packs into the copy and reported 39 check hits in 26 files and 1 possible secret. Report: scan-report.md; the copy was
/var/folders/8y/ww5f9x8x56b2sfrw5yzqwp1m0000gp/T/claude-packs-scan-uX1k2w (outside the repo; delete it when done).

| check id | pack | findings | files |
|---|---|---|---|
| hook-catch-must-not-allow | hook-proof | 15 | 15 |
| lookup-over-if-chains | base | 6 | 3 |
| lookup-over-ternary-chains | base | 6 | 5 |
| ui-no-gradient-text | ui-craft | 4 | 1 |
| prodbuild-no-remote-fonts | web | 3 | 1 |
| a11y-no-bare-outline-none | web | 1 | 1 |
| field-map-over-if-runs | base | 1 | 1 |
| ui-no-animate-layout | ui-craft | 1 | 1 |
| ui-no-bounce-easing | ui-craft | 1 | 1 |
| ui-no-stock-labels | ui-craft | 1 | 1 |

Only ten checks hit anything, so this is the whole list: 39 findings. Three findings each for the top three (the rest have 1 to 4):

- hook-catch-must-not-allow: global/hooks/gnu-shell.mjs:32 (`try { return Number(execFileSync(path, ['--version'] ...`), packs/audio-core/hooks/realtime-guard.mjs:20
  (`} catch {`), packs/base/hooks/brief-guard.mjs:74 (`try { return readFileSync(join(dir, '.claude/usage.log') ...`). The scan lists 5 of the 15; the
  other 10 are in the JSON. Most are catches that return a number or a default on a read, not on a payload parse; heartbeat.mjs:50 says so in a comment.
- lookup-over-if-chains: lib/logs.mjs:92 (`if (sub === 'crashes') return listCrashes(dir, log)`), packs/base/hooks/lib/shell-lex.mjs:38 (`if (c === "'")`),
  packs/base/hooks/lib/shell-writes.mjs:70 (`if (exe === 'echo')`; also :61 and :130).
- lookup-over-ternary-chains: packs/base/hooks/lib/code-shapes.mjs:22, packs/base/hooks/lib/program-writes.mjs:23 (and :59), packs/base/hooks/lib/run-status.mjs:172.
- ui-no-gradient-text: site/css/main.css:601, :603, :794 (and :795). prodbuild-no-remote-fonts: site/index.html:9, :10, :12. These are the website, not the kit.
- One possible secret: packs/base/hooks/secrets-guard.mjs:82 (a connection string with a password). It is the guard's own example pattern; read it before calling it clean.

Not a repeat finding, but the scan's "Structure" part is the repeat reader's output; it is part 3 below. 0 source files are over 300 lines.

## 3. The repeats reader (lib/repeats.mjs: repeatedShapes, nearCopies, remadeNames)

Two runs. (a) The scan's own: it skips test/ and anything in layout.protected, and reported 8 hand-written repeats, 2 near copies, 18 remade names.
(b) A one-off, run-repeats.mjs, over all 279 .mjs files with the test files renamed so the reader does not skip them: 9 shape groups, 0 near copies,
22 remade names. The reader is shape-based and strict, so it finds little. It does not see the repeats that matter most (parts 4 and 5), which are
one-line helpers with the same body: see "What the reader cannot see" below.

### Shape groups (copies written by hand), sorted by member count

| members | kind | where (path:line) | what differs |
|---|---|---|---|
| 3 | setup `console` | packs/base/hooks/kit-fresh.mjs:29, packs/synth-creator/hooks/lib/time-guard-selftest.mjs:89, packs/synth-creator/hooks/user-asks.mjs:140 | nothing the reader names: a stubbed console object |
| 3 | run (shell) | docs/workorders/typescript/run.sh:10, docs/workorders/planner/run.sh:10, prompts/workorder/run.sh:10 | none |
| 3 | run (shell) | docs/workorders/typescript/run.sh:51, docs/workorders/planner/run.sh:38, prompts/workorder/run.sh:51 | "Run docs/workorders/typescript/PROMPT.md" / "Run docs/workorders/planner/PROMPT.md" |
| 2 | run (shell) | docs/workorders/typescript/run.sh:34, prompts/workorder/run.sh:34 | none |
| 2 | run | test/look-report-merge.test.mjs:18, packs/base/hooks/lib/look-gate-selftest.mjs:13 | HOOK / hook |
| 2 | run | test/worktree-cases-packs.mjs:16, test/worktrees.test.mjs:101 | the hook name, the path, the exit code (4 parameters) |
| 2 | run | test/worktrees.test.mjs:63, test/worktrees.test.mjs:71 | none |
| 2 | run | packs/base/hooks/lib/git-guard-selftest.mjs:221, :223 | none |
| 2 | run | packs/synth-creator/hooks/lib/time-guard-selftest.mjs:41, :42 | none |
| 2 | markup | test/ui-depth.test.mjs:21, :22 | none |
| 1 | rows | packs/synth-creator/hooks/build-sweep.mjs:128; packs/cpp/hooks/compile-cache.mjs:32 | a `put(...)` call to be one table and one loop |

### Near copies (scan run only)

docs/workorders/typescript/run.sh:19 against prompts/workorder/run.sh:19-67 (9 of 10 statements); docs/workorders/planner/run.sh:19 against
docs/workorders/typescript/run.sh:19-67 (8 of 8). prompts/workorder/run.sh is the template; the two docs/workorders copies are instances: 194 lines
in three files, about 130 of them the same. Decide whether an instance should call the template.

### Functions made again under one name (remadeNames; 22 groups, 2 to 3 files each)

Sorted by member count. A "false" in the last column means the two functions do different jobs and should keep two names, not one module.

| members | name | where | the same helper? |
|---|---|---|---|
| 3 | isDir | global/hooks/gnu-shell.mjs:23, packs/base/hooks/lib/program-writes.mjs:20, packs/base/hooks/lib/shell-writes.mjs:39 | yes (global cannot import the hooks lib) |
| 3 | isSource | packs/base/hooks/file-size-guard.mjs:21, folder-law.mjs:20, lib/dup.mjs:34 | no: three different extension sets (part 5) |
| 3 | fileOf | packs/base/hooks/lib/dup-index.mjs:70, lib/repo-index.mjs:36, run-hooks.mjs:25 | check |
| 3 | withLayout | test/kf-new-projects.test.mjs:12, test/rule-tests.test.mjs:16, test/worktree-cases-commands.mjs:11 | yes: read layout, merge, write |
| 3 | judgeAdd | packs/base/hooks/repo-litter.mjs:41, secrets-guard.mjs:49, packs/reverse-engineering/hooks/firmware-out-of-git.mjs:21 | check |
| 2 | branchOf | lib/kit-lock.mjs:24, packs/base/hooks/making-check.mjs:99 | no: one runs git, the other reads HEAD on purpose (KWB-24) |
| 2 | readLock | lib/kit-lock.mjs:34, lib/manifest.mjs:11 | no: two different lock files |
| 2 | linesOf | lib/logs.mjs:15, packs/base/hooks/lesson-checks.mjs:78 | yes |
| 2 | buildFolders | lib/repo-weight.mjs:11, packs/base/hooks/lib/compile-cache.mjs:23 | yes |
| 2 | packOf | lib/scan.mjs:70, scripts/test-changed.mjs:53 | check |
| 2 | filesOf | lib/scan.mjs:46, test/planner.test.mjs:9 | check |
| 2 | setLayout | test/house.test.mjs:21, test/hover.test.mjs:14 | yes (a layout writer) |
| 2 | bodyOf | global/hooks/shell-traps.mjs:26, packs/base/hooks/lib/shape-code.mjs:59 | check |
| 2 | projectRoot | global/hooks/version-pin-guard.mjs:181, packs/base/hooks/lib/hook-log.mjs:52 | yes (global is separate) |
| 2 | hashOf | packs/base/hooks/lib/code-shapes.mjs:27, lib/near-copies.mjs:16 | yes |
| 2 | lineAt | packs/base/hooks/lib/code-shapes.mjs:28, lib/cpp-scan.mjs:90 | yes |
| 2 | blankQuotes | packs/base/hooks/lib/compile-cache.mjs:20, packs/synth-creator/hooks/build-guard.mjs:50 | yes |
| 2 | judgeWrites | packs/base/hooks/lib/dup-index.mjs:184, packs/synth-creator/hooks/spec-lock.mjs:82 | check |
| 2 | headOf | packs/base/hooks/lib/event-log.mjs:19, lib/function-shapes.mjs:33 | check |
| 2 | readText | packs/base/hooks/lib/repo-index.mjs:28, lib/shell-writes.mjs:30 | yes |
| 2 | nameOf | packs/base/hooks/lib/run-claudes.mjs:18, run-hooks.mjs:24 | check |
| 2 | projectOf | packs/base/hooks/lib/run-claudes.mjs:46, lib/run-status.mjs:184 | no: one strips the worktree suffix, the other checks the folder exists |

### What the reader cannot see

The reader reports a function only when two to three files define the same compound name (an exact name match), and a run only when the statement shapes
match. The helpers that matter for this plan are one-line arrow functions with the same body under other names, or defined once per file under a
common name such as `git` (4 or more files = "a convention" to it, so it is dropped). So part 4 was counted with grep on the bodies, listed there.

## 4. The DRY plan

Rule of the kit (CLAUDE.md): hooks import only from packs/base/hooks/lib/, never lib/; the CLI's lib/ re-exports what it shares; global/ is its own
island (no hooks lib beside it). So "the one module" is a file in packs/base/hooks/lib/ (hooks and tools), re-exported from lib/ where the CLI
needs it, and test/kit-cli.mjs for tests. "Lines saved" counts definition lines and prelude lines taken out, from the counts in the notes
column; call sites that stay one line each save nothing and are not counted. Estimates are marked "est."

| helper | the one module that should own it | every place with a copy today | lines saved |
|---|---|---|---|
| git runners | new packs/base/hooks/lib/git-run.mjs: `git(cwd, args, { identity, quiet, trim, onFail })`; lib/ re-exports; kit-cli exports `git` for tests | 22 definitions: lib/kit-lock.mjs:23, lib/custom-packs.mjs:16, scripts/changed-functions.mjs:7, scripts/test-changed.mjs:165, scripts/release.mjs:62, packs/base/hooks/git-guard.mjs:87 (gitOut), look-gate.mjs:32, lib/pushed.mjs:31, lib/selftest.mjs:14, lib/kit-fresh-look.mjs:81, packs/synth-creator/hooks/time-guard.mjs:41, packs/base/tools/statusline-work.mjs:13, tests: kf-refusals, custom-packs, sub37-wb, worktree-rig, test-changed, kit-lock, worktree-twins. Plus 87 inline `execFileSync('git'...)` lines (59 in tests) in 62 files | 17 (est.; five stay: release's token form, the curried kit-fresh-look, the identity one in selftest.mjs, statusline's cached one, global) |
| JSON reads | existing packs/base/hooks/lib/json.mjs `readJson(file, fallback)`; lib/ re-exports | 97 exact `JSON.parse(readFileSync(x, 'utf8'))` lines (119 of the 174 matches are in test/), 6 more inside try/catch returning a default: lib/once-only-report.mjs:11, lib/config-cli.mjs:11, lib/doctor.mjs:45,66, lib/scan-detect.mjs:101, packs/base/tools/test-verdict.mjs:35, packs/synth-creator/hooks/build-sweep.mjs:31,36, the four `lockOf`/`layoutOf` test helpers | 15 (est.: try/catch lines only; the rest shrink but stay) |
| real-path helpers | one `real(p)` in packs/base/hooks/lib/project.mjs (use dup.mjs's, which also resolves a path that does not exist yet) | packs/base/hooks/lib/project.mjs:32, hook-log.mjs:50, dup.mjs:81 (the better one), packs/synth-creator/hooks/user-asks.mjs:164, global/hooks/version-pin-guard.mjs:274 (must stay: global); 37 lines use realpathSync; the 11 `process.argv[1] === SELF` tails also compare real paths by hand | 4 |
| scratch folder makers | kit-cli `fresh(prefix)` / `projectWith` for tests; lib/selftest.mjs `scratchProject` for hooks | 70 mkdtempSync lines (55 in test/): own helpers in test/house.test.mjs:16, global.test.mjs:12, install.test.mjs:12, ~15 `project()` functions (fix-plan, postgres-pack, run-status, instances, source-ledger, workorder-check, run-claudes, prove-a-bank, logging, routes, once-only, scan, worktree-rig, configs); 12 hook selftests make their own folder | 40 (est.: about 3 lines per `project()` body) |
| hook selftest skeletons | existing lib/selftest.mjs `verdicts(name, cases)` + `scratchProject` + `runHook` | already used by 37 and 35 hooks. 12 hand-rolled, 404 body lines: packs/instrument-shell/tools/route-table.mjs, synth-creator hooks user-asks, build-guard, idle-wake, build-sweep, lib/time-guard-selftest.mjs, base hooks run-hooks, lesson-checks, lib/shell-writes-selftest.mjs, global/hooks version-pin-guard, gnu-shell, shell-traps (the last three cannot import it: global is separate, so global needs one small copy of its own, shared by those three) | 100 (est.: a quarter of 404) |
| payload parsing | existing packs/base/hooks/lib/writes.mjs `readPayload(text)` (8 files use it) | 22 hooks hand-write `let payload; try { payload = JSON.parse(text); } catch { return 0; }`: audio-core param-id-lock, realtime-guard; base brief-guard, file-size-guard, git-guard, lesson-checks, making-check, making, placement-law, run-hooks, shape-law; cpp compile-cache; stellix no-shipped-images; synth-creator build-guard, build-sweep, chart-first, frozen-files, protect-vendor, spec-lock, stage-guard, time-guard, user-asks | 44 (est.: two lines each) |
| layout reading | existing packs/base/hooks/lib/layout.mjs `readLayout(root)`; lib/ re-exports (lib/layout.mjs exists) | lib/once-only-report.mjs:11, lib/config-cli.mjs:11, lib/doctor.mjs:45,66, lib/scan-detect.mjs:101, packs/base/tools/test-verdict.mjs:35, build-sweep.mjs:31,36; tests hover, configs, rules-follow-the-code, install-block (`layoutOf`), kf-new-projects, rule-tests, worktree-cases-commands (`withLayout`), house, hover (`setLayout`) | 20 (est.) |
| lock reading | kit-cli `lockOf(dir)` for the `.claude/claude-packs.lock.json` copies in tests; lib/manifest.mjs `readLock` stays | test/configs, custom-packs, install-block (3 identical `lockOf`); lib/kit-lock.mjs `readLock` reads another file and is not a copy | 4 |
| isMain / --selftest tail | one `runAsHook(import.meta.url, name, main, selftest)` in hook-log.mjs; the 11 hand compares use the exported `isMain` | 33 identical one-line tails in packs/base/hooks and others (44 files import `asHook, isMain`); 11 files compare `process.argv[1]` by hand: scripts/test-changed.mjs:281, scripts/release.mjs:111, packs/base/tools/{shape-symmetry,quiet-test,statusline-runs,statusline}.mjs, packs/synth-creator/hooks/user-asks.mjs, packs/reverse-engineering/tools/{source-ledger,names-sweep}.mjs, base/hooks/lib/shell-writes.mjs, global/hooks/version-pin-guard.mjs:275 | 11 (33 tails stay one line, but one function owns the rule) |
| test preludes | test/kit-cli.mjs (extend: add `git`, `lockOf`, `layoutOf`, `setLayout`) | the 20 clone pairs of part 1; 34 of 92 test files have their own prelude: 18 own `CLI` consts, 23 `CLI`/`KIT` lines in all, 11 own `run`/`cli`, 7 own `git`, 10 own layout/lock helpers; 29 files without kit-cli carry 194 import lines | 160 (est.: 44 definition lines and about 116 import lines) |
| source-extension lists | new packs/base/hooks/lib/source-exts.mjs: one table, one row per language, with `.mts`/`.cts` in it | dup.mjs:23 (SOURCE regex), file-size-guard.mjs:20, folder-law.mjs:17, shape-code.mjs:12, elements.mjs:13-14 (CODE, MARKUP), lib/coverage.mjs:14, languages.mjs:47-63 (the largest table) | 6 (est.), and the .mts gap in part 5 closes in one place |
| remade names with one body (sub-list) | hooks lib: linesOf, buildFolders, hashOf, lineAt, blankQuotes, readText, isDir, projectRoot; tests: filesOf, withLayout, setLayout | the 9 "yes" rows of part 3 | 18 (est.: 2 lines per name) |

Total the plan removes: 17 + 15 + 4 + 40 + 100 + 44 + 20 + 4 + 11 + 160 + 6 + 18 = **439 lines** (est.), out of 25,594 (1.7 percent). The larger win is not lines: it is
the 97 JSON reads, 22 payload parses, 33 tails and 11 hand-compared main checks that each get one owner. The firm numbers (counted, not estimated) are the 20 clone pairs (165 lines), the 33 tails and
the 12 hand-rolled selftests (404 body lines).

Order that makes the plan safe: (1) kit-cli additions and the 34 preludes (tests only, no shipped code); (2) `git-run.mjs`, `readPayload`, `readJson`,
`readLayout` call-site swaps, one helper per commit, running only the tests those files reach; (3) the 12 hand-rolled selftests; (4) source-exts.mjs,
which belongs with the TypeScript conversion because it is the .mts fix. Two things to decide, not assume: dup.mjs's `real` and project.mjs's `real`
differ on a path that does not exist, so merging them changes behaviour; and global/ cannot share any of this, so it keeps one small copy of each helper.

## 5. Do the readers read .mts?

Checked by reading the extension lists and by running jscpd on a probe (mts/: a.mts, b.mts, c.cts, d.ts with one body).

| reader | file | extensions it accepts | reads .mts / .cts? |
|---|---|---|---|
| statement reader (every language row) | packs/base/hooks/lib/languages.mjs:49 | js row: .js .mjs .cjs .ts .tsx .jsx .mts .cts | yes |
| repeats reader | lib/repeats.mjs | whatever languages.mjs reads, for near copies and remade names; but `repeatedShapes` takes its shapes from elements.mjs, which has its own list | near copies and remade names yes; shape groups NO (see next row) |
| shape elements | packs/base/hooks/lib/elements.mjs:13-14 | CODE: .c .cc .cpp .cxx .h .hh .hpp .mm .js .mjs .cjs .ts .tsx .jsx; MARKUP: .html .htm .vue .svelte .tsx .jsx .ts .js .mjs | NO |
| repo index | packs/base/hooks/lib/repo-index.mjs:13 | ALL_CODE (languages.mjs, which has .mts) plus MARKUP (elements.mjs, which lacks it) | code shapes yes, markup shapes no |
| duplicate detector, file filter | packs/base/hooks/lib/dup.mjs:23 (`SOURCE`, used by `isSource`, which once-only.mjs:38 calls on every write) | regex ending `js|mjs|cjs|jsx|ts|tsx|rs` | NO: a write to a .mts file is never sent to jscpd, so once-only is silent on it |
| duplicate detector, jscpd formats | packs/base/hooks/lib/dup.mjs:24,26 (`-f` and `--cross-formats`) | format names, not extensions: javascript, jsx, typescript, tsx | yes when run over the tree: jscpd read a.mts, b.mts and c.cts as typescript and found all three pairs against d.ts; but the file filter above drops writes first |
| shape-law (code) | packs/base/hooks/lib/shape-code.mjs:12 (`CODE`) | .c .cc .cpp .cxx .h .hh .hpp .hxx .inl .mm .m .js .mjs .cjs .ts .tsx .jsx .py .swift .rs .go .java .kt .cs | NO |
| file-size-guard | packs/base/hooks/file-size-guard.mjs:20 | .js .mjs .cjs .ts .tsx .jsx among others | NO: a .mts file has no line limit |
| folder-law | packs/base/hooks/folder-law.mjs:17 | C and C++ and shader extensions; a layout's `sourceFiles` regex overrides it | NO (the kit's own layout would need `sourceFiles` to name mts) |
| coverage | lib/coverage.mjs:14 | C, C++, Objective-C, shaders | not a JS reader; irrelevant |

Blind to .mts today: packs/base/hooks/lib/elements.mjs (CODE and MARKUP), packs/base/hooks/lib/dup.mjs (SOURCE regex), packs/base/hooks/lib/shape-code.mjs
(CODE), packs/base/hooks/file-size-guard.mjs (SOURCE). Partly blind: lib/repeats.mjs (shape groups, through elements.mjs) and repo-index.mjs (markup).
Not blind: languages.mjs and jscpd. Seven files hold a source-extension list; the fix is the one table of part 4, row "source-extension lists".
Note that .cts is missing in the same four files.
