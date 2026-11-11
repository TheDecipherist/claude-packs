# Survey: the CLI, lib/, scripts/ (read-only, branch work/2.0.0-typescript)

Read in full: bin/claude-packs.mjs (254 lines), 45 files in lib/ (3,087 lines), scripts/release.mjs (113), scripts/test-changed.mjs (281), scripts/changed-functions.mjs (46), package.json (49), 8 configurations/*/config.json (85 to 174 lines each), 2 profiles/*.layout.json (315, 247), prompts/** (7 files, 737 lines), and CLAUDE.md "Installer" and "Configurations". Nothing was run. Import data comes from a text scan of `from '...'` and `import('...')` in lib/*.mjs.

## 1. Command table and import graph

bin/claude-packs.mjs is one `switch (command)` in `main()` (line numbers move; cite the case names). `parse(argv)` is a hand-made flag loop that returns an untyped `opts` bag; commands also read leftover flags from `rest` by `rest.includes('--x')` / `rest.indexOf` (`--from`, `--template`, `--out`, `--zip`, `--repo`, `--branch`, `--auto`, `--prompt`).

| Command | lib modules it calls (all through bin) |
|---|---|
| new | install-block (readInstallBlock, blockPacks), config-cli (readConfig), workorder (assertTemplate, newWorkorder), new (newProject) |
| claude-ai-skill, planner-skills | planner (writeClaudeAiZips, plannerSkills) |
| workorder [check] | workorder (newWorkorder), workorder-check |
| init (+ --auto, --from) | suggest (suggestionOf, detectedConfig), sync, install-block (installFrom, blockPacks), shape-cli (isSynth, ensureShape), config-cli (readConfig), doctor |
| add, remove, update | custom-packs (loadCustomPacks, addCustomPack), sync, doctor, manifest (readLock) |
| update-all | manifest, sync, doctor (loops dirs, catches per dir) |
| configs, config | config-cli (describeConfigs, layoutConfiguration, switchConfig) |
| doctor | doctor |
| shape | shape-cli (shapeCommand) |
| symmetry | NOT lib: dynamic `import('../packs/base/tools/shape-symmetry.mjs')` then `.main([...rest,'--dir',dir])` |
| scan, fix, suggest | scan, fix-plan, suggest; `scan --prompt` and `survey` print prompts/scan-review.md and prompts/survey.md |
| logs | logs |
| status | status-cli (passes `--dir` back into the arg array) |
| new-pack | custom-packs (newPack) |
| global add/remove/doctor | global (a lookup table `{add, remove, doctor}[rest[0]]`) |
| dup scan | once-only-report (dupScan) |
| lock | kit-lock (lockCommand) |
| list | packs (availablePacks, readPack, PRESETS) |

`bin` also imports `readLock` from manifest for every command (even `list`, `global`, `lock`) and calls `loadCustomPacks` (which runs `git clone/fetch` for each source in the lock) for every command not on its skip list `['new-pack','scan','suggest','fix','logs','global','claude-ai-skill','status']`. So `doctor`, `list`, `lock`, `shape` and `dup` pay for custom-pack fetches when a lock names sources. Exit codes: `main().then(code => process.exit(code ?? 0))`; some branches return a number, some `break` and return undefined.

### lib import graph (lib to lib, counts are importers inside lib)

- Hubs (5 or more importers): packs.mjs 10 (configs, custom-packs, doctor, layout, scan, settings, shape-cli, suggest, switches, sync), configs.mjs 8, kit-command.mjs 5, manifest.mjs 5. sync.mjs has 4, coverage/doctor/scan 3.
- Roots nothing in lib imports (only bin or tests): config-cli, custom-packs, global, kit-lock, new, planner, status-cli, suggest, workorder-check.
- Leaves (import no lib module and no hook lib): backup, build-queue, coverage, git-tokens, kit-command, kit-lock, manifest, pack-manifest, packs, rule-tests, selftest-cache, symmetry-doctor, zip.
- Cycles (ESM tolerates them because every use is inside a function): scan.mjs <-> fix-plan.mjs (scan imports `rememberScan`, fix-plan imports `scan`); scan.mjs -> sync.mjs -> found-folders.mjs -> scan.mjs (`filesOf`); suggest.mjs -> scan.mjs (`filesOf`, a file lister living in the scan report module).
- The heaviest module is doctor.mjs (136 lines, 16 lib imports + core-budget); scan.mjs (171 lines) has 10.

### What lib takes from packs/base/hooks (package paths, not installed paths)

| lib file | imports from the hooks tree | kind |
|---|---|---|
| shape.mjs (4 lines) | `export *` from hooks/lib/shape.mjs; `findSelectorDefs`, `findUnknownTypes` from hooks/lib/shape-code.mjs | re-export |
| run-status.mjs (5) | `export *` run-status.mjs; `runnersIn, runningOrders, workIn` run-discovery.mjs; `projectGroups, runTree` run-tree.mjs | re-export |
| config-cli.mjs (36) | re-exports `describeConfigs, readConfig` from its own sibling configs.mjs | re-export inside lib |
| layout.mjs | `NEW_INSTALL_GIT` (git-auth.mjs), `codeFolders` (layout.mjs) | direct import |
| rules.mjs | `globsForConcepts as kitGlobs` (layout.mjs); also dynamic `import()` of the project's installed `.claude/hooks/lib/layout.mjs` | both |
| doctor.mjs | `coreBudget` (core-budget.mjs) | direct |
| scan.mjs | content.mjs `isContent`, layout.mjs `readLayout`, and `isSecretFile` from **hooks/secrets-guard.mjs (a hook, not a lib)** | direct |
| repo-weight.mjs | `BIG_MB, isRootImage` from **hooks/repo-litter.mjs (a hook)** | direct |
| repeats.mjs | elements, code-shapes, languages, near-copies, glob | direct |
| shape-cli.mjs | glob.mjs `matchesAny` | direct |
| once-only-report.mjs | dup.mjs `findJscpd, repoClones`; shape.mjs `readShape` (bypassing lib/shape.mjs) | direct |
| found-folders.mjs | dup.mjs `SOURCE`, content.mjs `isContent` | direct |
| hook-timing.mjs, logs.mjs | hook-log.mjs `readHookLog` | direct |
| global.mjs, status-cli.mjs | json.mjs `parseJson` / `toJson, writeJson` | direct |
| scan-detect.mjs | content.mjs | direct |
| global.mjs FILES table | copies `packs/base/hooks/lib/{shell-writes,program-writes,program-read,command-prefix,shell-lex}.mjs` into ~/.claude as files | by path string |

So CLAUDE.md's "lib/ re-exports hook libs (e.g. lib/shape.mjs)" is true for only two files; 14 other lib files import hook libs directly, and two of those import a hook file, not a lib (scan.mjs takes `isSecretFile` from secrets-guard.mjs, repo-weight.mjs takes `BIG_MB, isRootImage` from repo-litter.mjs), so a hook's exports are an API the CLI depends on. The pack hooks import nothing from lib/ (the rule holds). The kit's own .claude/hooks/kit-lock.mjs is the one reverse case: it imports `../../lib/kit-lock.mjs` and `../../packs/base/hooks/lib/writes.mjs`.

Duplication of a hook-lib function inside lib (instead of using the hook lib): (a) `readJson/parseJson` in hooks/lib/json.mjs vs 28 raw `JSON.parse(readFileSync(..))` in lib+bin+scripts (config-cli, configs x3, doctor x2, fix-plan, install-block, manifest, layout, kit-lock, new, once-only-report x2, packs, scan-detect x2, shape-cli, settings, symmetry-doctor, sync x2, bin, release); the kit has a ratchet on raw JSON calls (commit 9cda395 "raw JSON calls back to 547"). (b) `readLayout` (hooks/lib/layout.mjs) vs `layoutOf` in config-cli.mjs and once-only-report.mjs, `currentLayout` in sync.mjs, `namedConfig` in scan-detect.mjs, inline reads in doctor.mjs (twice) and `sourceFilesOf` in configs.mjs. (c) `SOURCE` is exported twice with different meanings: coverage.mjs (C/C++/shaders) and hooks/lib/dup.mjs (C, Python, JS, TS, Rust); scan.mjs takes the first, found-folders.mjs the second. (d) `SKIP` folder regexes in coverage, scan, git-tokens, shape-cli and hooks/lib/elements.mjs. (e) the GitHub-token regexes in git-tokens.mjs vs hooks/lib/secret-patterns.mjs and git-guard.mjs.

## 2. The install pipeline

Order inside `sync()` (lib/sync.mjs, 134 lines): readLock -> currentLayout -> `normalisePacks` (packs.mjs: base first, presets expanded, `readPack` each) -> `resolveConfig` (named, else layout.json, else `inferConfig`) -> `packsFor` + `listedPacks` -> `readSettings` (throws on bad JSON before any write) -> `backup` (CLAUDE.md, settings.json, layout.json, lock to .claude/.claude-packs-backup/<stamp>, last 5) -> `ensureGitignore` -> `withFoundFolders` (scan.mjs `filesOf`, so a git spawn) -> `buildLayout` (layout.mjs writes layout.json) -> `createFolders` -> `switches` (what turns on) -> `copyPackFiles` -> `removeDropped` -> `syncSettings` -> `applyPaths` (rules.mjs rewrites each rule's `paths:` from `# concepts:`) -> `writeClaudeMd` -> re-hash rules -> `writeLock`.

**What is copied** (lib/packs.mjs `planFiles`): for each pack, EVERY file, of any extension, found by a recursive `walk` under `packs/<pack>/rules/`, `checks/`, `hooks/`, `tools/` goes to `.claude/<same relative path>`; everything under `skills/` goes to `.claude/skills/...` (or `<layout folder>/.claude/skills/...` when pack.json `skillsIn` names a layout folder). Two root files are copied when the pack has them: `clang-tidy` to `.clang-tidy` and `clippy.toml` to `clippy.toml` (`userOwned`, never replaced). The only exclusions are the regex `JUNK = /^(__pycache__|\.DS_Store)$|\.pyc$/`, files named in layout `disable`, and a rule whose `# hook:` frontmatter names a disabled hook. Nothing in a pack outside those five folders is copied (pack.json, README, other folders). There is no extension filter and no `.mts`/`.d.ts` awareness: a `.mts` source or a `.map` under packs/*/hooks/** would be installed into every project and written into its lock.

**Lock** (lib/manifest.mjs, 24 lines): `.claude/claude-packs.lock.json` = `{ kit, packs, installed, sources?, updated, files: { "<rel>": sha256 } }`. `hashFile` = SHA-256 of the file bytes (`readFileSync`) after copy; for rules it is re-hashed after `applyPaths` has rewritten `paths:` (sync.mjs, last loop), so a rule's lock hash is of the rendered text, not the pack text. `isPackVersion` also accepts a rule equal to `renderRule(packText, layout)`. Never-overwrite: an existing untracked file, or a file whose hash differs from the lock, is kept and the pack copy goes beside it as `<file>.pack-new`.

**Settings** (lib/settings.mjs, 158 lines): a hook script is "ours" if its basename matches `/\.claude\/hooks\/([\w-]+\.(?:mjs|py))\b/` and is a file some pack ships (`kitHookScripts()` reads `hooks/*.mjs|py` of every pack; top level only), is in `RETIRED`, or was in the previous lock. Kit entries are removed and rebuilt from pack.json `hooks`; kit node hooks of one settings entry fold into one `node .../run-hooks.mjs a.mjs b.mjs` command, but only if the installed file text matches `HOOK_EXPORT` (a regex for `export const hook` / `export { hook }`). `switches.mjs` limits new hooks/checks with `SWITCH = /^(hooks\/[\w-]+\.(mjs|py)|checks\/[\w-]+\.json)$/`. configs.mjs `itemsOf` counts hooks with `/^\.claude\/hooks\/[^/]+\.(mjs|py)$/`.

**Where emitted .mjs must sit (hard constraints found):**
1. Installed hooks at `.claude/hooks/<name>.mjs`, libs at `.claude/hooks/lib/*.mjs`, tools at `.claude/tools/*.mjs`: settings commands, `NODE_HOOK`, `SCRIPT`, pack.json hook commands, and each hook's `./lib/x.mjs` imports all name those exact paths. There is no build step in the target.
2. lib dynamically imports installed files: rules.mjs, coverage.mjs and hover-gate.mjs import `<project>/.claude/hooks/lib/{layout,glob}.mjs`; hook-proof.mjs imports `.../lib/hook-log.mjs`; scan.mjs imports `.claude/hooks/lesson-checks.mjs`, `lib/glob.mjs`, `secrets-guard.mjs` from the copy.
3. lib statically imports `../packs/base/hooks/lib/*.mjs` (14 files, section 1) plus `hooks/secrets-guard.mjs`, `hooks/repo-litter.mjs`; bin imports `../packs/base/tools/shape-symmetry.mjs`; global.mjs copies five libs from `packs/base/hooks/lib` and reads `global/hooks/*.mjs`; the repo's own .claude/hooks/kit-lock.mjs imports lib/ and packs/ by relative path. So the compiled `.mjs` must exist in packs/ and lib/ in the package (not only in a dist/), unless every one of these paths is rewritten.
4. Tests and the work orders spawn `node packs/base/hooks/<hook>.mjs --selftest`; scripts/test-changed.mjs regexes (`packs/<p>/hooks/[\w-]+\.(mjs|py)`, `/\.(mjs|js)$/` in `graph`, `^test/.*\.test\.mjs$`) and scripts/changed-functions.mjs (`/\.(mjs|js)$/`) see only .mjs/.js.

**Shipped files** (package.json `files`): `bin, lib, global, prompts, planner, profiles, packs, configurations, README.md, DISCLAIMER.md, CHANGELOG.md`. NOT shipped: scripts, docs, test, site, .claude. There is no `.npmignore`, no negation pattern and no `prepack`/`build` script. `packs` ships whole, including `*-selftest.mjs` rigs and `lib/house.py`, so a `.mts` kept beside its `.mjs` in packs/ or lib/ would ship unless excluded with `"!**/*.mts"` in `files`; and would also be installed (above) unless planFiles filters it. `planner/` ships and is read by planner.mjs and workorder-check.mjs by path. `engines.node >=22`; dependencies `yaml 2.9.1`, optional `jscpd 5.4.2`. package.json has no `exports` and no `types`.

## 3. doctor (lib/doctor.mjs, 136 lines), in order

| # | Check (module) | Spawns / reads | Per install constant? |
|---|---|---|---|
| 1 | lock has packs; `configProblems` (configs.mjs) | lock, layout.json, config.json | project (cheap) |
| 2 | rule `paths:` current: `applyPaths(checkOnly)` (rules.mjs) | dynamic-imports installed hooks/lib/layout.mjs; reads rules | project (layout) |
| 3 | every layout folder exists | layout.json | project |
| 4 | settings.json mentions `lesson-checks.mjs` | settings.json | project |
| 5 | **`node lesson-checks.mjs --selftest`** (execFileSync, every run, never cached) | node | constant per kit version + pack set; project only through its checks |
| 6 | `useJscpd` (once-only-report) | looks for jscpd (fs) | project machine |
| 7 | **every hook's `--selftest`** (46 node/python3 children, a pool of `max(4, coreBudget())`, 180 s each; `browser-guard.py` via python3) | node, python3 | constant per kit version and machine; cached (below); project only via `layout.guards` |
| 8 | `symmetryProblems`: **`node tools/shape-symmetry.mjs --selftest`**, then design/shape.json many-concept note | node | selftest constant (not cached); shape.json project |
| 9 | SKILL.md length under 8,000 and description starts "Use " (lock files that end SKILL.md) | fs | constant per kit version (pack content) |
| 10 | `manifestProblems` for each lock pack (pack-manifest.mjs) | pack.json | constant per kit version |
| 11 | `hookProofProblems` (hook-proof.mjs): hook not run by settings; crash since the hook last changed (hooks.log vs mtimes, logs.mjs clears) | dynamic-imports hook-log.mjs | project |
| 12 | `statusProblems`: `node param-id-lock.mjs --status`, `settings-layer.mjs --status` | node x2 | project |
| 13 | `buildQueueProblems` | fs | project |
| 14 | `pageGateProblems`, 15 `hoverGateProblems` (hover-gate.mjs; each calls `projectFiles`) | **git ls-files x2 each** | project |
| 16 | `tokenProblems` (git-tokens.mjs): .git/config of nested repos and siblings | fs only | project |
| 17 | `shapeProblems` (shape-cli.mjs) | fs | project |
| 18 | `onceOnlyDoctor`: **`node making.mjs --cost`**, then jscpd over the repo (`repoClones`), `.claude/state/duplicates.json` ratchet | node, jscpd, writes state | project (slow) |
| 19 | `timingProblems`: median per hook from .claude/hooks.log | fs | project |
| 20 | `coverage` (coverage.mjs): `projectFiles` runs `git ls-files` twice; imports installed glob.mjs and layout.mjs | git x2 | project |
| 21 | `ruleTestProblems` (rule-tests.mjs) | reads every file in test folders | project |
| 22 | edited managed files note | hash each lock file | project |

Git spawns per doctor: 2 (coverage) + 2 + 2 (the two gate checks call `projectFiles` again) = 6 `git ls-files`, same answer each time. The only `python3` spawn is `browser-guard.py` (and `global doctor` for a Python forerunner). `git` is also spawned in `sync` through `filesOf` (found-folders) on a first install.

Constant per kit version (could run once, at release or at install of a new kit version, not in every project's doctor): checks 5, 7 (all but the guards key), 8's selftest, 9, 10 (a pack-content invariant that test/ could assert). Selftest cache (lib/selftest-cache.mjs, 40 lines): key = SHA-256 over (the bytes of every file under `.claude/hooks/lib` sorted, `hooks/run-hooks.mjs`, `process.version`, `process.platform`, `CLAUDE_PACKS_JSCPD`, `JSON.stringify(layout.guards)`) then the hook file bytes. A pass is an empty file named by the key in `$CLAUDE_PACKS_SELFTEST_CACHE` or `<tmp>/claude-packs-selftests`; failures are never stored. It does not hash tools/, rules, checks or settings.json, so a hook whose selftest reads them can pass stale. `CLAUDE_PACKS_SELFTESTS=gate` (set by test/fresh-tmp.mjs) skips all selftests; `=run` forces; `--fresh` runs all. Under TS the hashed bytes are the emitted .mjs, which is correct, but the lib hash needs `filesUnder` to ignore .mts/.map if they are installed.

## 4. Repetition in lib (helper, every copy, owner)

| Helper | Copies | Owner |
|---|---|---|
| git runner | coverage.mjs `ls` in `gitVisible`; custom-packs.mjs `git` (throws, pipes stderr); kit-lock.mjs `git` (swallows, returns ''); new.mjs local `git` inside `newProject`; scan.mjs `filesOf` (`-C`); shape-cli.mjs `files` (cwd); scripts/changed-functions.mjs `git` and scripts/test-changed.mjs `git` (spawnSync, `-C`); scripts/release.mjs `sh`/`out` | one `lib/git.mjs`: `git(cwd,args,{throws})`, `gitFiles(dir)` |
| list tracked + untracked files | coverage.mjs `gitVisible`, scan.mjs `filesOf`, shape-cli.mjs `files`, and their three fallback directory walks (coverage `projectFiles`, scan.mjs `walk`, shape-cli inner `walk`) | `lib/files.mjs` `projectFiles(dir)` computed once per doctor |
| recursive folder walk | packs.mjs `walk`, selftest-cache.mjs `filesUnder` (also listed by planner.mjs), scan.mjs `walk`, coverage.mjs x2, git-tokens.mjs `repos`, test-changed.mjs `walk`; the `__pycache__`/.pyc filter is written in packs.mjs `JUNK` and selftest-cache.mjs | `lib/files.mjs` |
| read JSON | 28 raw `JSON.parse(readFileSync)` (list in section 1); layout reads: config-cli `layoutOf`, once-only-report `layoutOf`, sync `currentLayout`, scan-detect `namedConfig`, doctor x2, configs `sourceFilesOf`, `configProblems` | hooks `json.mjs` `readJson`, and one `readLayout` |
| lock reader | manifest.mjs `readLock` (kit lock file) and kit-lock.mjs `readLock` (the lease): same name, different file; `LOCK` exported by both; hooks/lib/kit-version.mjs `lockVersion` reads the lock a third way | rename kit-lock's to `readLease`; one `manifest.mjs` |
| path realpath / real | git-tokens.mjs (`realpathSync` of a config), test-changed.mjs `realpathSync(SELF)`, the kit-lock hook's `real` | hooks lib (isMain by real path, KWB-158) |
| logger | `log = console.log` default in 19 lib modules (signature varies: positional `log` in doctor, logsCommand, timingProblems, onceOnlyDoctor, dupScan; option `{ log }` in sync, scan, fixPlan, newProject, installFrom, workorder, planner (both)); `console.log` direct in custom-packs, sync's `placeBeside` takes `log`, bin prints help directly | one `Logger` type passed in an options object |
| `kitCommand`/package name | kit-command.mjs `PACKAGE` vs hooks/lib/kit-version.mjs `KIT` | hook lib `KIT` |
| error text from a failed child | `String(e.stderr ?? e.message).trim().split('\n')[0]` in custom-packs and new; `String(e.stderr)` in doctor; `e.stdout+e.stderr` in symmetry-doctor | one `childError(e)` |
| `readdirSync(...).filter(f => /\.(mjs|py)$/.test(f))` | doctor, hook-proof, packs `kitHookScripts`, switches, configs `itemsOf`, custom-packs, settings | one `HOOK_FILE` regex |
| "read the layout": lib/layout.mjs (`buildLayout`), hooks/lib/layout.mjs (`readLayout`, `codeFolders`, `globsForConcepts`) | the same file also written by install-block `applyOwned` (read-merge-write by hand) | layout.mjs |

## 5. The release path

Today, from a commit on a work branch to the package on npm:
1. Branch `work/<version>-<topic>` from fetched origin/main (manual, git-guard enforced), commits by name, push from the first commit.
2. Bump `version` in package.json (manual; package-lock.json carries it too; `versionBumpOnly` in test-changed.mjs lets a bump-only diff pick no tests).
3. Write a `## <version>` section in CHANGELOG.md (manual; `notesFor` in release.mjs refuses a missing or empty one, matches the version whole).
4. Update README.md: the per-pack count rows `| \`pack\` | ... | rules | checks | hooks | skills |` (manual), configuration and preset rows, the command list.
5. Update site/index.html `data-count` for packs, rules, checks, hooks, skills, configurations (manual; 39, 283, 357, 46, 94, 8 today).
6. Update the lists in test/noop.test.mjs (CHANGED, REVIEWED, REPAIRED, SWEEP_CHANGED, FULL_STACK_CHANGED, ...: every installed file whose content changed on purpose, with a version comment) by hand.
7. Gate: `npm run test:changed -- --base origin/main` on committed work (scripts/test-changed.mjs: changed files to tests by static import graph with 2 hops, path names and TABLE; changed hooks prove their own selftests first).
8. Land with the land-branch skill: merge origin/main into the branch (never rebase), merge the branch into main, **push main** (manual, a git-guard step; `pushNeedsYes` can make it the owner's), fast-forward the main checkout (`git merge --ff-only origin/main`).
9. On main: `GH_TOKEN=... npm run release` (scripts/release.mjs): refuses off main, dirty tree, no token, or local main not equal to GitHub's main; then `npm publish`, `git tag -a vX` + push of the tag over HTTPS, `gh release create` with the CHANGELOG section. Each step is skipped when done; `--dry-run`. `npm publish` needs the user's yes and npm auth.

What a script could do: step 2 (a `bump` command that edits package.json and package-lock together), the CHANGELOG heading (from "unreleased" to the version and date, with a check for non-empty), steps 4 and 5 (render the README count rows and the site numbers from `packs/*`), step 6 (a generated manifest of installed-file hashes per version instead of hand lists), step 8 (a `land` script: fetch, merge, `push origin HEAD:main`, ff the main checkout, with the gate result passed in) and gate-on-release (release.mjs could run `test-changed --base origin/main` itself and refuse a red or missing run).

Tests that exist only because a number is maintained by hand:
- test/readme.test.mjs (55 lines): "every pack has its row, with its true counts" (compares four cells per row with `countIn` and `hooksOf`) and "every hook base installs is in the table"; both would be deleted by a generated table. Its other tests stay (the refusal quote equals the check's own words, headings, every command in the help is named on the page).
- test/site.test.mjs (32 lines): "the numbers on the page are the kit's true counts" (six counts) would be deleted by generating the page numbers; "no analytics", "relative paths" and "site not shipped" stay.
- test/noop.test.mjs (149 lines): not a count, but its CHANGED/REVIEWED lists are the hand-kept "which installed files changed on purpose"; a generated per-version manifest would replace the lists and keep the assertion.
- Also hand-kept: lib `PRESETS` rows (packs.mjs) mirrored in the README preset table (readme test 2); the HELP text in bin/claude-packs.mjs mirrored in the README command list (readme test 3).
- The hook counts differ by design: the site counts `.mjs|.py` files in `packs/*/hooks`, the README counts distinct commands in pack.json `hooks`, and the lock counts files; a TS build that adds `.mts` or `.d.mts` beside the `.mjs` breaks the site count (`/\.(mjs|py)$/` on a readdir) only if the emitted files are `.mjs` and sources are elsewhere.

## 6. What breaks under strict TypeScript in lib

- Option bags typed by default values, destructured with no type: every `{ force = false, mkdirs = false, seedLayout = null, config: named = null, sources = null, log = console.log } = {}` (sync, switchConfig, fixPlan, scan, newProject, lockCommand, globalAdd, applyOwned, installFrom). `null` defaults would infer `null` types; each needs an interface (`SyncOptions`, `Logger`). `bin` builds `opts` with ten fields, adds `fresh` after the literal (`opts.fresh = true` is not in the initial object, a strict error) and sets `opts.seed` to a path string while `seedLayout` is parsed JSON.
- The `rest` array drives commands by `rest.includes('--x')` / `splice(indexOf(...), 2)[1]` (`--from`, `--template`) with `string | undefined` flowing into `resolve()`; `fromUrl` is `string | null`.
- Optional/variadic/positional drift: `doctor(projectDir, log = console.log, {…})` has `log` positional and `{…}` third; `logsCommand(dir, rest, log)` and `plannerSkills(out, log, {zip})` mix positional log and an options bag; `takeLock(root, session, branch = branchOf(root), pid = …, now = Date.now())` has four optional positionals, called with `undefined` placeholders in `acquire` (`takeLock(dir, session, branch ?? branchOf(dir), undefined, now)`); `describeSwitch(from, fromSources, to, toSources, layout, installed = null)`; `renderRule(text, layout, globsForConcepts = kitGlobs, strict = false)`; `coverage(projectDir, source = SOURCE)` is passed a `RegExp | undefined` (`sourceFilesOf`).
- Dynamic shapes with no declared type, each needing an interface: the lock `{ kit, packs, installed, sources?, updated, files }` (readLock returns a different literal when absent), layout.json (about 25 owned keys, `OWNED` list in layout.mjs, `complete`, `configuration`, `guards.*`), pack.json (`folders, concepts, kinds, hooks, optIn, onByDefault, skillsIn, statusLine, synth, leaveOut`), config.json (`packs{always,choose,default}`, `hookOrder`, `preamble`, `sourceFiles`, `layout`), scan results (`pick`, `results`, `secrets`, `repeats`, `near`, `remade`, `weight` passed as one object literal to `report()` with 13 fields), settings.json hooks (groups of `{matcher, hooks:[{type,command,timeout,async}]}`), the kit lease (`readLock` returns one shape from three file forms), `CUSTOM` Map.
- `import(pathToFileURL(...).href)` of installed project files (rules.mjs, coverage.mjs, hover-gate.mjs, hook-proof.mjs, scan.mjs): result is `any`/`unknown`; needs a declared module interface for `glob.mjs`, `layout.mjs`, `hook-log.mjs`, `lesson-checks.mjs`.
- `catch {}` with no type or handling (30 sites): kit-lock.mjs x5 (`git`, `readLock`, `transcriptSeen` x2), scan-detect x4, shape-cli x4, scan x3, git-tokens x2, logs x2, once-only-report x2, and one each in configs (`sourceFilesOf`), coverage (`gitVisible`), custom-packs (`gitConfig`), global, rule-tests, repo-weight, selftest-cache, settings (`runnable`). Typed `catch (e)` then `e.stderr`, `e.stdout`, `e.message` on an unknown: custom-packs `loadCustomPacks`, doctor (lesson-checks), new, symmetry-doctor, install-block, configs (`configProblems`), settings. With `useUnknownInCatchVariables`, each needs a narrowing helper (`childError`).
- Regex match results used unchecked: `m[1]` after `.match(...)`: settings.mjs (`h.command.match(NODE_HOOK)[1]`, `SCRIPT`), switches, scan-detect, install-block, workorder-check `kitSkills`, fix-plan; `readdirSync().filter().map(...)`. `Object.fromEntries`/`Object.entries` on untyped objects (configs `planOf`, `describeConfigs`, layout.mjs `Object.entries(pack.kinds ?? {})`) with destructured `{ contentWas, ...v }`.
- Mutating object params: settings.mjs mutates `settings.hooks`, `g.hooks`; layout.mjs mutates `current.guards` / `current.ruleTests`; scan.mjs and fix-plan read results by property with optional chaining (`s.pick?.packs ?? []`), where absence is a legal state in the JSON file but not in the type.
- `process.env.X ?? default` and `Number(process.env...)` (doctor SELFTEST_JOBS; kit-lock `CLAUDE_PID`); `Symbol('not JSON')` sentinel in global.mjs `userJsonOrStop` typed as `unknown`; `Buffer.writeUInt*` in zip.mjs (fine).
- Mixed return types: `bin` branches return `number | undefined | Promise<number>`; `kit-lock.acquire` returns one of `{mine}`, `{held}`, `{took}`; `coverage` returns arrays plus counts; `shapeProblems`/`symmetryProblems`/`...Problems` all return `string[]` (easy, uniform); `recommend` returns `{config, why, always, packs, leftOut, early, fullStack}`.
- scripts: test-changed.mjs `graph`, `choose` (an options mix of `status`, `fnNames`, a default `g = graph(root)`), `TABLE` rows with `when?` and a variable-arity `tests` callback (`(text, changed, root, test)`) are the hardest scripts to type; release.mjs `plan`, `refusals` take one object each (typed easily).

## 7. The kit's own install (.claude/ in the repo)

- It is a committed install of configuration `base`, packs `base` + `writing` + `hook-proof` (`.claude/claude-packs.lock.json`: kit 1.9.0, 161 managed files: 87 under hooks (28 top-level hook files, 61 in hooks/lib), 35 rules, 26 skills, 9 tools (statusline*.mjs, quiet-test, test-verdict, shape-symmetry), 4 checks). `.claude/layout.json` (configuration `base`) names the kit's own folders: bin, lib, packs, configurations, global, profiles, prompts, planner, test, scripts, docs, site.
- `.claude/hooks/kit-lock.mjs` (143 lines) is the one file not in any pack and not in the lock: it is in the repo's committed `.claude/settings.json` (PreToolUse `*`, run through `run-hooks.mjs`). It imports `../../lib/kit-lock.mjs` (the lease format, `acquire`, `renew`, `liveness`, `checkouts`) and `../../packs/base/hooks/lib/writes.mjs`, and keeps `.claude-packs-lock` (ignored by git) at each checkout; `claude-packs lock status|take|release` is the same code from the CLI.
- `kit-fresh.mjs` (pack hook, in base) runs at SessionStart and before a commit in this repo; in the kit's own repo it fetches and compares the checkout against origin/main and `origin/work/<version>-*`.
- How it stays current: `update --dir .` (run from the repo with `node bin/claude-packs.mjs update --dir .`, or by `update-all`) runs `sync` against the kit's own `packs/` (the package IS the source), which overwrites any `.claude/hooks/*.mjs` whose lock hash matches and writes `<file>.pack-new` beside any the user edited; then `doctor` runs (including the selftests of all hooks) and a commit follows by hand (git log: "The kit updated from work/... KWB-167", "The kit's own install updated"). `.claude/settings.json` is rebuilt for kit hooks only; `kit-lock.mjs` survives because it is not in `kitHookScripts()` and not in the lock, and `unfold` keeps a project hook that was inside a runner command (KWB-26).
- TS consequence: because the repo's `.claude/hooks/*.mjs` are copies of packs/base/hooks/*.mjs hashed in the lock, an emitted-`.mjs` pipeline must update both the source tree and this install (the `update` step is what copies the emitted `.mjs`); the install holds the JS the hooks run, so the `.claude/` copy must stay `.mjs` (the lock hashes it, doctor runs `--selftest` on it, settings name it). kit-lock.mjs and any `.claude/hooks/lib/*-selftest.mjs` rig are what a TS-built hook set would still run as plain JS.

## Other facts worth knowing for the order

- configurations/*/config.json (8 files): `sourceFiles` is a regex string (`node` and `full-stack` already include `mts|cts`, cpp/go/python/rust their own, base and synth-creator none so doctor's default `SOURCE` counts only C/C++/shaders); the kit's own configuration is `base`, so doctor's coverage ignores .mts in this repo unless layout.json sets `sourceFiles`. `hookOrder` only in synth-creator (11 entries); `leaveOut` unused in all 8. Profiles (stellix, sub37) are `complete: true` seed layouts, read through `--profile` by URL from `profiles/<name>.layout.json`.
- hooks/lib/languages.mjs already lists `.ts .tsx .mts .cts` under the `js` row; test/file-size.test.mjs checks `.mjs/.py/.sh` only, so `.mts` source would escape the 300-line limit test; `file-size-guard` reads the project's sourceFiles.
- prompts/ is read by path: `prompts/scan-review.md`, `prompts/survey.md` (bin), `prompts/workorder/{PROMPT.md,run.sh,templates/*.md}` (workorder.mjs `PROMPTS`, planner.mjs `TEMPLATES`); `run.sh` calls `kit-fresh.mjs --check` per KWB-156. They ship (`prompts` in `files`) and contain `{{name}}`, `{{date}}`, `{{kit}}` placeholders replaced by `replaceAll`.
- bin/claude-packs.mjs has a `#!/usr/bin/env node` shebang and is the package `bin`; it must stay a runnable JS file at that path (a compiled `bin/claude-packs.mjs`), with its relative imports `../lib/*.mjs`.
