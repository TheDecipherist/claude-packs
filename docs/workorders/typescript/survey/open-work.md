# Open and unreleased work the TypeScript order must absorb, carry or leave (survey, 2026-11-11)

Read-only survey of `~/projects/claude-packs`, branch `work/2.0.0-typescript` (HEAD 9cda395, the same commit as
`origin/work/1.9.0-platforms`; `git log origin/main..HEAD` is 22 commits, all 1.9.0 work). Step names are the order's W0 to W9
(`docs/workorders/typescript/workorder.md`). The order has no "not done" section yet; W9's report is where a CARRY list belongs.

Evidence limits: "present" below means the named code or test was found by grep on this branch; no test was run. The old
`work/0.x` to `work/1.5.x` branches share no history with HEAD (their merge-base is empty), so `git log --grep` on HEAD cannot see
old KWB commits; I judged those rows by the code instead.

## 1. Release state

| Item | Value |
|---|---|
| Last version on npm | 1.8.2 (`npm view`; the version list ends 1.7.2, 1.8.2). 1.8.0 and 1.8.1 were never published; their work is in 1.8.2 |
| This branch's package.json | 1.9.0 |
| CHANGELOG sections with no npm release | `## 1.9.0 (unreleased: work/1.9.0-platforms)`. The 2.0.0 section does not exist yet |
| Versions between npm and this branch | 1.9.0 only (1.8.2 is current on npm). `origin/work/1.9.1-admiral-skill` also claims a number, 1.9.1, branched from 1.8.2 (see 5) |
| CHANGELOG 1.9.0 lacks entries for | KWB-165, KWB-166, KWB-167 (the log says fixed; the CHANGELOG list stops at KWB-164 and the Mac-suite line). Add them before the release |
| docs/history.md | its last entries are the 0.6.0 kit-law notes and the Sub37 WB-1 to WB-4 fixes; nothing in it is open work |

`package.json` `files` is bin, lib, global, prompts, planner, profiles, packs, configurations and three docs: no `docs/`, no `test/`,
no `scripts/`. W2.3 changes this list; `scripts/` stays out, so the new `scripts/*.mts` need no shipping decision.

## 2. Open KWB rows (status [gap]): 17

Verdicts: FOLD IN (the conversion or its structure fixes it), CARRY (stays open, listed under "not done"), DONE ALREADY (the fix is on
the branch and the row is stale: close it in `workflow-bugs.md`, as its own commit, before W0's baseline).

| KWB | What | Files it names | Verdict |
|---|---|---|---|
| 166 | The release gate takes 30 min on the Mac; pick tests per changed function, prove hook selftests once in parallel | `scripts/test-changed.mjs`, `lib/selftest-cache.mjs` | Mostly DONE ALREADY: 40ff196 (WIP) and 9cda395 ("the gate's reds fixed") are on the branch, `test-changed.mjs` has `selftestsOf` and the per-kind table. The row's own text says "not measured under 6 min". FOLD IN: W6.1 converts the picker, W7 measures the release (under 300 s) and closes the row |
| 154 | Nothing refuses a whole-disk `find` | `global/hooks/shell-traps.mjs` or base | DONE ALREADY: `packs/base/hooks/no-find.mjs` (1.8.2, published). The row's second half (every brief carries the order's sources) is a skill/rule text change, not code. Row stale |
| 153 | A test the kit runs has no memory or time limit | `packs/base/tools/quiet-test.mjs`, `packs/synth-creator/tools/buildq.mjs`, cpp pack | CARRY: no limit code in quiet-test (grep for timeout, memory, ceiling found none). New behaviour, not a conversion |
| 152 | Kit not proved the same on Linux, macOS, Windows (umbrella) | `core-budget.mjs`, `run-discovery.mjs`, cpp pack, run-a-workorder | Mostly DONE ALREADY by the 1.9.0 sweep (KWB-155 to 165). With Windows meaning WSL only, the Windows third drops. CARRY the remainder (the platform audit's "five worst" 1, 3, 4 and the README steps per system, see 4) |
| 151 | Same warning flags, different compiler families | cpp pack rules and gates, doctor | CARRY: only the rule text for `-Wdouble-promotion` exists; no `clang -fsyntax-only` pass |
| 137 | `inside-the-project` refuses the main checkout `git -C` that git-guard's Stop demands, in a worktree session | `packs/base/hooks/inside-the-project.mjs`, `git-guard.mjs` | CARRY: logged on planner (merged), not fixed. Both hooks are in W4's base-hooks slice; typing does not fix it |
| 135 | `idle-wake` enabled alone imports opt-in `user-asks` and crashes | `packs/synth-creator/hooks/idle-wake.mjs`, `lib/switches.mjs` | CARRY: idle-wake still imports `./user-asks.mjs` and switches.mjs has no "needs" notion. Touches W4 slices 3 and 4 only by conversion |
| 134 | `doctor --strict` says OK when settings run a hook file that is gone | `lib/doctor.mjs` | CARRY, but note W6.3 and W2's gates ask for `doctor --strict` OK on a scratch install: a deleted-hook planted fault would catch it cheaply (optional FOLD IN at W6.3) |
| 133 | git-guard's `gh repo create` message can print `null/<name>` | `packs/base/hooks/git-guard.mjs` (line 168 builds `${owner}/<name>`) | CARRY, unverified: the template still interpolates `owner`; I did not run it |
| 131 | `test:changed` maps no test to a change under `docs/` | `scripts/test-changed.mjs` | FOLD IN: W6.1 converts the picker and W7.1 reworks it; add the `docs/**` row (the test `no-personal-name.test.mjs` reads every file) with its planted fault. Not in the picker today (grep for `docs` found nothing) |
| 124 | Unattended session's background agents stopped at turn end | `packs/base/hooks` | DONE ALREADY: `agents-held.mjs` refuses `run_in_background` when unattended (line 54), the rule `agents-held` ships. Row stale |
| 123 | `test-verdict --help` runs the whole suite; `suite-once` lets it through | `packs/base/tools/test-verdict.mjs`, `suite-once.mjs` | CARRY: no flag handling found in test-verdict. W4's base-tools slice converts it; fixing is separate and needs its own test, red first |
| 120 | `names-sweep` takes hours on big images | `packs/reverse-engineering/tools/names-sweep.mjs`, `tools/lib/unwrap.mjs` | DONE ALREADY: `names-sweep.mjs` carries "one pass for each form (KWB-120)" and `shiftedHitsMany`. Row stale |
| 116 | Five tests red on main on the Mac | `test/kf-refusals.test.mjs`, `new.test.mjs`, `worktrees.test.mjs`, `quiet-test.test.mjs` | Mostly DONE ALREADY: KWB-159 (KF-17, shape-law) and KWB-160 (new's "nothing global") and the 1.9.0 Mac-suite fixes cover four of the five names. W0's baseline names whatever still fails. Row stale |
| 115 | protect-vendor refuses clearing a declared build output | `packs/synth-creator/hooks/protect-vendor.mjs` | CARRY, unverified: the file mentions `buildOutput`, I did not read whether it is read ahead of the vendored reading |
| 113 | No job has an expected time; no ledger or watch | `packs/base/hooks/time-guard.mjs` | CARRY: a feature, large. Overlaps W7's timing only in spirit |
| 86 | `making-check` median 933 ms in long sessions | `packs/base/hooks/making-check.mjs` | CARRY: W8 may measure it, W7.3 does not. Hook starts are the Mac's cost (platform audit, the five worst, item 1) |

Count of the 17 rows: DONE ALREADY 4 (154, 124, 120, 116), FOLD IN 2 (166 at W6/W7, 131 at W6), CARRY 11 (153, 152, 151, 137,
135, 134, 133, 123, 115, 113, 86).
Rows 124, 120, 154 and 116 should be marked fixed in `workflow-bugs.md` first: an open row the order did not touch reads as
a fault the conversion left, and `doctor` or a reviewer will count it.

## 3. Fixed-but-unreleased KWB rows

Fixed in `work/1.8.1-remotes`: KWB-148, 149, 150. They are in 1.8.2, which is published, so they are released, not at risk.
Fixed in `work/1.9.0-platforms` (unreleased), each checked by grep for its code or test on this branch:

| KWB | Evidence on this branch |
|---|---|
| 147 | `git-guard.mjs` counts untracked for clean only (selftest case) |
| 155 | `test/worktree-twins.test.mjs` present; repo-index.mjs reads "what a checkout already holds" per checkout (no literal `worktrees` string in it; the test is the proof) |
| 156 | `packs/base/hooks/kit-fresh.mjs`, `lib/kit-fresh-look.mjs`, `lib/kit-fresh-selftest.mjs`, `lib/kit-version.mjs`, `prompts/workorder/run.sh` (3 hits), `test/fresh-tmp.mjs` and its test |
| 157 | `lib/pushed.mjs` (9 hits of `pushNeedsYes`), `git-guard.mjs`, rule `finished-work-lands.md` |
| 158 | `prove-a-bank.mjs` uses `isMain`; `version-pin-guard.mjs` uses `fileURLToPath`; `test/fresh-tmp.mjs` |
| 159 | `lib/shape-prose.mjs` `firstParameters` |
| 160 | `lib/git-auth.mjs` `loggedInAs`, `git-guard.mjs` `env.login` |
| 161 | `lib/run-claudes.mjs` `sessionOrders`, `lib/run-discovery.mjs`, `test/run-claudes.test.mjs` |
| 162, 165 | `packs/base/tools/statusline.mjs` `kitVersion`, `lib/kit-version.mjs` `runningKit` |
| 163 | `test/file-urls.test.mjs` (reads every source); 16 hooks |
| 164, 167 | `lib/run-status.mjs` `runRows` (`paused`); `test/run-status.test.mjs` |
| 166 | `scripts/test-changed.mjs` `selftestsOf`; commits 40ff196, 9cda395 |

No unreleased fix is missing from this branch: every commit of `origin/work/1.9.0-platforms` is an ancestor of HEAD. Three risks for
the conversion: KWB-163's gate (`file-urls.test.mjs`) reads every source for the old `new URL(...).pathname` form and must read
`.mts` too (W2.6); KWB-166's picker and selftest cache are the code W6 and W7 rewrite, so convert them together with their tests;
KWB-155's twin test depends on `.claude/worktrees/` layout, which W4's six agents create in this very repo, so it is the first test
likely to fire on the order's own work.

## 4. docs/platform-audit.md (2026-11-11)

The user's correction: Windows means WSL only (Linux there). Dropped as native-Windows: five-worst item 4's `.cmd`/`shell: true` half
and item 5 whole (`/C:/` paths, `touch`, `sh -c`, `py -3`; the `/C:/` part is already fixed by KWB-163 and gated). In "the rest": the
`.cmd` and shim lines (buildq, jscpd/`findJscpd`, release.mjs), the `win32` guards (agents-held, time-guard `\` paths), `build-sweep`'s
Windows `du`, `vst3host` on Windows, `py -3` in the CLI, `process.execPath` as a Windows fix, the `pgrep` on Windows line, and the
`cacheDir` `LOCALAPPDATA` branch in kit-fresh (harmless; keep or drop, see 6). Everything else is Linux or macOS and stays.

| Audit item | Status and verdict | Step |
|---|---|---|
| Suite on the Mac: 22 failures (6 groups) | Largely fixed (KWB-155 to 165); baseline decides the rest | W0.3 |
| Worst 1: 8 `node` starts per Bash call, one runner entry per event | Done in the install (settings run `run-hooks.mjs` with 6 hooks per event); the status-line `lsof` narrowing not found | DONE ALREADY / CARRY the `lsof` part |
| Worst 2: status line `ps` plus `lsof` every 30 s | CARRY: speed work, not conversion | W7 may reuse |
| Worst 3: shell-traps refuses BSD forms without GNU tools; `global add` sets no bash | CARRY (macOS behaviour) | none |
| Worst 4: quiet-test `lsappinfo` polling every 300 ms | CARRY (macOS); the `.cmd` half is dropped | none |
| Worst 5: Windows doctor red | Dropped (native Windows); `/C:/` already fixed | none |
| shell-writes `findGnuSed` without GNU sed | CARRY | none |
| agents-held `parentOf`; time-guard `ps`/`\` paths | CARRY; the `win32` part dropped | none |
| git-guard about 8 git calls per commit (`for-each-ref`) | CARRY; speed | W7 if the release gate times it |
| `dup.mjs` `findJscpd` shim | Windows part dropped; `require.resolve` still wanted for `.mts`: jscpd must read the new extension | W2.6 (FOLD IN) |
| `chart-first.mjs` `git ls-tree` per write cache | CARRY | none |
| `browser-guard.py`, `house.py` ported to `.mjs` | FOLD IN: these ports are the order's own scope (Python removed) | W3.2, W4 |
| buildq / test-verdict `bash -c` / shape-symmetry `shell:true` / build-sweep / vst3host | CARRY (`bash -c` and POSIX sh wording matter on macOS and Debian) | none |
| CLI `process.execPath`, `py -3`; `release.mjs` shell | `process.execPath` FOLD IN while typing `bin`/`lib` (W4.4); `release.mjs` is rewritten | W4.4, W7.2 |
| `run.sh` and run-a-workorder detach (`workorder start`, no `setsid` on macOS) | CARRY | none |
| pdf-to-md `pgrep -fc` poll loop | CARRY (a skill text fix) | none |
| `a-control-is-proved-through-its-input.md` says `xvfb-run -a` | CARRY | none |
| The Mac itself (30x program-start cost, tests' temp folder under `~/projects`) | Measurement note; supports W7's goal | W7.3 |
| Also open: KWB-147 patch | Done (b3f9832, 7155795) | done |
| `claude-packs report`, CONTRIBUTING.md, `contribute` | CARRY: features | none |
| KWB-151, 153, 154 | see table 2 | CARRY, CARRY, done |
| Release once, 1.8.x folded in | Done for 1.8.x (1.8.2 published); 1.9.0 and 2.0.0 are the next one | W7.2 |

## 5. Branches on origin

`git branch -r` lists 119 refs. Merged into this branch (ancestors): `origin/main` (7363e73, 1.8.2), the 1.6.0-planner, 1.6.1 to 1.8.2
work branches, `work/1.9.0-platforms` (identical to HEAD) and `work/2.0.0-typescript` itself. Not merged, and all dead except one:

| Branch | Last commit | Date | Merged | Verdict |
|---|---|---|---|---|
| `origin/work/1.9.1-admiral-skill` | 5e19ef5 "The admiral pack: drive-a-session-through-admiral ..." | 2026-11-11 | no (one commit over 1.8.2) | LIVE. Touches `packs/admiral/pack.json` (new), a SKILL.md, 8 `configurations/*/config.json`, README, site/index.html, build.md. Touches no `packs/base/hooks/lib` and no `lib/`, so it need not land before the conversion, but it changes pack and skill counts that W6.2 ("README's counts, noop lists, the page's numbers") holds. Merge it before W6 at the latest (before W0 is cleaner), and take its version number from the release plan: it says 1.9.1, which collides with 1.9.0 and 2.0.0 |
| `origin/work/0.9.13` to `1.6.1-faults`, about 100 branches (0.9.13-kit-guards, 0.10.0-configs, ... 1.5.13-outside-docs, W0 to W6, final-evidence, `1.6.1-faults`) | latest 1.5.13-outside-docs a14831c 2026-11-09 | 2026-11-03 to 11-09 | no: empty merge-base with HEAD (history was rewritten; main has 60 commits, the old branches 292) | DEAD. Their content is in HEAD (for example `agents-held.mjs`, `names-sweep.mjs` carry KWB-124 and KWB-120). `1.6.1-faults` is a log-only branch (KWB-138, 139) |
| `gh/main` (7abe4ea, 2026-11-03), `hub/main` (ad3206a, 2026-11-05) | | | no | DEAD: other remotes' old mains, same old history |
| `1.6.0-planner`, `1.6.1-*`, `1.7.*`, `1.8.*` | | 2026-11-09 to 11 | yes | merged, deletable |

Nothing unmerged touches `packs/base/hooks/lib` or `lib/` except the dead old history.

## 6. kit-fresh (packs/base/hooks/kit-fresh.mjs, KWB-156)

What it does. Three entry points: the hook (SessionStart, and PreToolUse Bash for a commit), `--check` (called by
`prompts/workorder/run.sh` before every session; exit 2 means do not start), and `--selftest`. In a project (root from
`claudeRoot`), it reads the installed kit with `runningKit` (`node_modules/@thedecipherist/claude-packs/package.json`, else the
lock's `kit`) and compares it with npm's newest through `newestOnNpm` (`npm view`, 8 s limit, kept in the user's cache folder
`kit-fresh.json`, once a day, an unanswered ask retried after an hour). Older: it says the `npm install -D ... && update` command and,
with `CLAUDE_PACKS_UNATTENDED`, blocks the session. In the kit's own repo (`package.json` name equals the package) it runs
`git fetch`, then compares the checkout's version (the larger of package.json and the `work/<version>-` branch prefix) with
`origin/main` and every `origin/work/<version>-*` ref that is newer and not an ancestor; if any, it says so and, at a `git commit`
(regex `COMMIT`), refuses until switched or merged. Offline: says it could not check, blocks nothing.

What must hold after the conversion:

1. It runs as an emitted `.mjs` in an installed project's `.claude/hooks/`, with `lib/kit-fresh-look.mjs`, `kit-version.mjs`,
   `json.mjs`, `project.mjs`, `hook-log.mjs` beside it (`.claude/hooks/lib/`). The settings entry names `kit-fresh.mjs`, not `.mts`
   (pack.json lines for SessionStart and the Bash group); doctor's "hook file gone" case (KWB-134) is the one gap there.
2. `isKitRepo` compares `package.json` name with the package name and `runningKit` reads `node_modules/@thedecipherist/claude-packs/package.json`:
   the published package must keep that name and a plain `version`. If W2.3 ships `.mts` too (d-3), `kit-fresh` must still run the
   `.mjs`.
3. The kit-repo branch rule is `^origin/work/(\d+\.\d+\.\d+)-`. The order's branch `work/2.0.0-typescript` gives own version 2.0.0, so
   `origin/work/1.9.1-admiral-skill` (1.9.1) is not "newer" and will not refuse commits here; but any new branch whose number exceeds 2.0.0
   (an agent branch named `work/<order>-<name>` has no version prefix, so it is ignored). The merged-ness test is
   `merge-base --is-ancestor`, so a merge of 1.9.1 into the order clears it. Worktrees of agents named `work/typescript-w3a` do not match
   the pattern, so they are never judged.
4. The 2.0.0 release: npm's newest becomes 2.0.0; every project on 1.x then gets "update first", and in unattended runs the session does
   not start until `update`. `compareVersions` reads `major.minor.patch` only (no prerelease), so a `2.0.0-rc` tag would compare as
   2.0.0; publish no prerelease to the `latest` tag.
5. The test `test/fresh-tmp.mjs` pins the cache to the kit's own version so no test asks npm; the converted helper must keep that
   (`CLAUDE_PACKS_CACHE_DIR`). The selftest (`kit-fresh-selftest.mjs`) plants `git` and `npm` as functions: convert with their types, keep
   them injectable. No network in any test.
6. `askNpm`'s `shell: process.platform === 'win32'` and `cacheDir`'s `LOCALAPPDATA` branch serve native Windows only; WSL takes the
   Linux branch. Harmless; drop them in the same commit that types the file, or leave (not required).
7. The kit's repo has this hook enabled in its own install (`.claude/settings.json`, commit eda651f), so the kit's own sessions run it:
   `update --dir .` after the conversion must reinstall the emitted file (W6.3).

## 7. Order step to item map

| Item | Owner |
|---|---|
| KWB-166 (picker, selftest cache, 5-minute release) | W6.1 and W7; close the row at W7's measure |
| KWB-131 (docs row in the picker) | W6.1 FOLD IN |
| KWB-134 (doctor: settings entry names a gone file) | CARRY (optional W6.3 planted fault); `lib/doctor.mjs` is converted in W4.4 |
| KWB-154, 124, 120, 116 | DONE ALREADY: close the rows before W0 (stale) |
| KWB-123, 133, 135, 137, 115, 86 | CARRY: hooks and tools W4 converts but must not change; any fix is its own commit with its test red first |
| KWB-113, 151, 152 (remainder), 153 | CARRY: features and cross-platform proofs outside a type conversion |
| Platform audit worst 1 (runner entry) | DONE ALREADY |
| Platform audit worst 2 to 4, "the rest" (non-Windows) | CARRY |
| Platform audit worst 5 and every `.cmd`/`py -3`/shim line | DROPPED (native Windows) |
| `house.py`, `browser-guard.py` ports | W3.2 and W4 (also an audit item) |
| `dup.mjs` jscpd and `.mts` reading | W2.6 |
| `file-urls.test.mjs` (KWB-163 gate) reads `.mts` | W2.6 / W5 |
| CHANGELOG 1.9.0 entries for KWB-165, 166, 167; new 2.0.0 section | W7.2 (the release) |
| `work/1.9.1-admiral-skill` merge, its version number | before W6; a decision for the order (d-n) |
| kit-fresh after the conversion | W6.3 (install), W6.4 (package), items 1 to 7 of section 6 |
