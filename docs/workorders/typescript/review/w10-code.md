# W10 code review: bin/, lib/, scripts/, global/, proxy/, packs/*/hooks, packs/*/tools

Scope: 284 `.mts` sources (not `.d.mts`, not emitted `.mjs`) plus proxy's Go, read on branch `work/2.0.0-typescript` at aabf300.
Method for every finding: read the code at the cited lines (checked), and where a count is given it comes from `grep` over the
source list (`git ls-files` of those folders) or `git grep -nw` over tracked non-`.mjs` files. Nothing was fixed or run beyond
read-only commands. `dup scan` was not run (the order forbids installing); the helpers below are the same-job ones it cannot see.

Sizes: S = an hour or less, M = a few hours, L = more.

## Ranked findings

### 1. `alive(pid)` is written three times with two different answers (M, correctness)
- `packs/base/hooks/lib/daemon-find.mts` `alive`: any error from `process.kill(pid, 0)` means dead.
- `packs/base/hooks/resident/lifecycle.mts` `alive`: `EPERM` means alive (the process exists, another user's).
- `packs/base/hooks/resident/selftest-rig.mts` `alive`: a third copy with the daemon-find answer.
- `lib/daemon-cli.mts` (stop/status) and `lib/doctor-daemon.mts` use daemon-find's; `resident.mts` (`parentGone`) and the start lock use lifecycle's.
  So `daemon stop`/doctor can call a live daemon of another uid dead, while the start lock treats it as live.
- Fix: one `alive` in `lib/` of the hooks (daemon-find or a new `process-alive.mts`), `EPERM` is alive, imported by all four callers and the rig. Add a selftest case for an EPERM pid.
- Checked: read all three definitions and the five call sites.

### 2. A plain-object guard is written 36 times and four modules name it, with two meanings (M)
- `x !== null && typeof x === 'object' && !Array.isArray(x)` appears 36 times (grep) in sources. Named copies: `merge-out.mts` `asRecord`,
  `lib/logs.mts` `asObject` (also copies it through `Object.fromEntries(Object.entries(v))`, a no-op clone), `proxy-wire.mts` `isRecord`,
  `shape-model.mts` `isRecord` + `asRecord`. The last one does NOT exclude arrays, so an array passes as a record there.
- Fix: one `isRecord(v): v is Record<string, unknown>` and `asRecord(v)` in `hooks/lib/json.mts` (which already owns `parseJson`/`readJson`), arrays excluded; replace the named copies and the inline forms. Decide shape-model's array behaviour on purpose.
- Checked: grep for the idiom and the four definitions by reading them.

### 3. Raw `unknown`/casts where a shared shape exists: `Layout.guards`, `paramIds`, and `readJson<T>` (M-L, typing)
- `Layout.guards` is `Record<string, unknown>` (`types.d.mts`), `Layout.paramIds` is `unknown`. Each reader then re-narrows with its own cast:
  `git-guard.mts` `gitGuards` (`git as GitGuards`), `code-shape.mts:85` (`as CodeShapeGuard`), `lib/core-budget.mts` `projectLayout` (`layout as BudgetLayout`),
  `lib/build-queue.mts:15`, `smoothing-checks.mts:30-31`, `param-id-lock.mts` `idSettings`, `settings-layer.mts:50-53`, `time-guard.mts:171`, `no-shipped-images.mts:30-31`, `content.mts:13`.
  Ten places each state, by hand and by cast, the part of `guards` they read.
- `readJson<T>`/`parseJson<T>` (`hooks/lib/json.mts:63`) return `JSON.parse(text) as T` with no check; every `readJson<X>(...)` is a cast by another name (for example `checks-compiled.mts:47`, `hook-log.mts:128`).
- Fix: declare `LayoutGuards` in `types.d.mts` (`git`, `build`, `buildq`, `smoothing`, `codeShape`, `content`, `logs`, `time`, `images`, each its own interface, all optional) and `paramIds?: { extensions?: string; patterns?: string[] }`; drop the per-hook casts that only restate it. Keep one validating reader for the untrusted ones (the project's data). Name `readJson<T>` honestly (`readJsonAs`) or give it a guard argument.
- Checked: read `types.d.mts` Layout, and each cited reader.

### 4. A cast that restates what the type already says (S)
- `lib/sync.mts:159`: `(config['leaveOut'] as string[])` where `Configuration.leaveOut` is already `readonly string[]` in `types.d.mts`; the
  `[key: string]: unknown` index signature on `Configuration` is what pushed the code to the bracket form. `preambleOf` (sync.mts:109-115) re-validates `config.preamble` from `unknown` though `Configuration.preamble` is typed. Either the type is right (use `config.leaveOut`, `config.preamble`) or the JSON is untrusted (then validate once at `readConfig`, not here).
- `lib/ts-project.mts:62-63`: `(settings['extraKnownMarketplaces'] ?? {}) as Record<string, unknown>`, two lines, no comment; `Settings` (`lib/settings.mts`) could carry both keys. Same at `ts-project.mts:38`.
- `lib/install-block.mts:33`: `data as Record<string, unknown>` right after the same check `asRecord` (finding 2) would give.
- `lib/coverage.mts:77`: `import(...) as Promise<T>` on a caller-chosen `T extends object`: an installed module's shape is declared in `types.d.mts` (`InstalledGlobModule`, etc.); the generic hides which.
- Fix: S each; remove the casts with the types and `asRecord`.
- Checked: read each line and the `Configuration` interface.

### 5. Home, cache and config folders are worked out in nine places with different precedence (M)
- Cache folder: `lib/custom-packs.mts` `cacheRoot` (`CLAUDE_PACKS_CACHE` else `~/.cache/claude-packs`), `lib/proxy-binary.mts` `cachedBinary` (same rule, inlined),
  `hooks/lib/kit-fresh-look.mts:50-53` (win32 LOCALAPPDATA, else `XDG_CACHE_HOME`, never `CLAUDE_PACKS_CACHE`), `tools/statusline.mts:42` `runsCache` (`XDG_CACHE_HOME`, never `CLAUDE_PACKS_CACHE`).
  A user who sets `CLAUDE_PACKS_CACHE` moves the packs and the proxy binary but not the fresh-look or the runs file.
- Claude home: `run-transcripts.mts:33` `claudeHome`, `statusline.mts:61` (same expression inline), `lib/global.mts:62` (`join(home ?? homedir(), '.claude')`, ignoring `CLAUDE_CONFIG_DIR`).
- `DaemonHost` object `{ env, home, platform, uid }` is built four times: `lib/doctor-daemon.mts` `hostOf`, `lib/daemon-cli.mts` `here`, `tools/statusline-daemon.mts:28`, `resident.mts:143` (`Host`, a superset), each with `env.HOME || homedir()` or just `homedir()`.
- Fix: one `places.mts` in hooks lib (`cacheDir(env)`, `claudeHome(env)`, `hostOf(env)`), used by all. Decide the precedence once (CLAUDE_PACKS_CACHE, then XDG, then ~/.cache).
- Checked: read each function.

### 6. Hash helpers: sha256 of a file four times, sha256 of text five times, the temp-folder keyed file three times (S)
- File hash: `lib/manifest.mts` `hashFile`, `lib/global.mts:52` `sha`, `scripts/build-proxy.mts:46` `sha256Of`, `lib/doctor-proxy.mts:23` (inline), plus `build-proxy.mts:41` streaming. `hashFile` is the owner; the other three are character-for-character the same.
- Text hash: `proxy-wire.mts:89` `sha`, `lib/constant-checks.mts:15`, `lib/custom-packs.mts:37`, `look-gate.mts:56`, `lib/selftest-cache.mts:27,56`, beside `hooks/lib/hash.mts` `shortHash` (sha1, "the one short hash", W2.5) which does not cover sha256 and is the reason these stayed.
- Keyed file in the temp folder: `lib/scan.mts:66` `pointerOf`, `repo-index.mts:50` `fileOf`, `dup-index.mts:101` `fileOf` (the only one that uses `shortHash`).
- Fix: add `sha256(data, length?)` beside `shortHash`, and `tmpKeyed(prefix, key)`; call them. Also `send-backs.mts:20` and `user-asks.mts:88` are sha1 copies of `shortHash`'s body (`slice` aside).
- Checked: grep for `createHash(` and read each.

### 7. Slash normalisation `.replace(/\\/g, '/')` appears about 20 times; `posix` and `slashed` exist twice more (S-M)
- Inline in `lib/backup.mts`, `configs.mts`, `git-tokens.mts`, `packs.mts`, `project-files.mts`, `switches.mts`, `settings.mts` (twice), and hooks `folder-law`, `elements.mts`, `glob.mts`, `run-claudes.mts`, `making-check-turn.mts`, `placement-law`, `skill-first`, `once-only`, `repo-litter`, `project.mts:91` `relInCheckout`;
  named copies `lib/coverage.mts:31` `slashed`, `scripts/test-changed-graph.mts:10` `posix` (split(sep).join('/') form), `lib/pack-manifest.mts:48` (same split form).
- The "path relative to its checkout, forward slashes" job is `relInCheckout` (project.mts), yet `folder-law`, `placement-law`, `skill-first`, `making-check-turn.mts:181` re-spell `relative(checkoutRoot(...), p).replace(...)` by hand.
- Fix: one `slash(p)` in `files.mts`; call `relInCheckout` in the four hooks. S for the owner, M to sweep.
- Checked: grep, read project.mts and the four hooks.

### 8. Four directory walks and two workorder listings that `files.mts` `walk` could serve (M)
- `files.mts` `walk` is the owner. Separate walks: `elements.mts` `codeFiles` (skip globs, size cap, `statSync` per file), `dup-index.mts` `sourceStats` (exclude, size cap, mtime), `lib/git-tokens.mts` `repos` (bounded depth: deliberate and commented, keep), `synth-creator/hooks/build-sweep.mts:49` `entriesOf`.
  `codeFiles` and `sourceStats` do the same job (every source file under a root, minus excludes, under a size cap) with different results (rel list vs `{m,s}` map) and different folder-skip rules (`SKIP.test(rel)` vs `matchesAny(r/x, ex)`), so two hooks can disagree on which files exist.
- `run-claudes.mts:74` and `run-status.mts:102` both list the subfolders of `docs/workorders`.
- Fix: one `sourceFiles(root, { exclude, maxBytes })` returning `{ rel, mtime, size }`, used by both; one `workorderNames(project)`.
- Checked: read the four walks.

### 9. Same-named little things twice: `stamp`, `isMain`/`real`, `writeVerdict` (S)
- `hooks/lib/hook-log.mts:56` `stamp` and `resident/lifecycle.mts:46` `stamp` are byte-identical; both also hand-rotate a full log (hook-log `appendRotated`, lifecycle `daemonLog`'s `renameSync`).
- `real` (realpath or resolve): `project.mts:10` (exported), `shell-writes.mts:232`, `global/hooks/lib/global-hook.mts:10` (global is a separate install, so that one is allowed; note it). `isMain`: `hook-log.mts:81`, `shell-writes.mts:233`, `global-hook.mts:14`.
  `shell-writes.mts` should import `isMain` and `real` (it is a lib that imports from `project.mts` already in the family).
- `run-hooks.mts:241` writes stdout and stderr with an inline copy of `hook-log.mts:157` `writeVerdict`; and `readFileSync(0)` in a try/catch appears in `hook-log.mts:165`, `run-hooks.mts:231`, `tools/statusline.mts:75`.
- Fix: export `stamp` and use `appendRotated` in lifecycle; delete the shell-writes copies; call `writeVerdict`-style helper (`writeStreams(stdout, stderr)`) from run-hooks; one `readStdinText()`. S.
- Checked: read each pair.

### 10. Source files over 250 lines (the split-before-the-limit rule; none over 300) (M)
Counted with `wc -l` over the source list. Files at or past 250 (`pack-template.mts` is exactly 250: at the line, not over):
| lines | file | what it does | where it would split |
|---|---|---|---|
| 282 | `bin/claude-packs.mts` | the CLI: flag parsing, 14 command functions, the table, `main` | `bin/commands/install.mts` (`init`, `newCommand`, `updateAll`, `installAndCheck`), `bin/args.mts` (`SWITCHES`, `VALUE_FLAGS`, `parse`, `seedOf`), leave `COMMANDS` + `main` |
| 275 | `packs/base/hooks/git-guard.mts` | the token law, the house laws, the hook, its selftest | the selftest and `worktreeCase` (about 60 lines from line 253) to `git-guard-selftest.mts` (a `git-guard-selftest.mts` already exists in lib: move the rest there), the token law (lines 51-81) to `lib/git-token-law.mts` |
| 260 | `packs/base/hooks/lib/types.d.mts` | every shared shape | by the file's own banners: hook contract / writes / project files (Layout, Lock, Shape) / installed modules (lines 217+) into `types-hook.d.mts`, `types-project.d.mts`, `types-installed.d.mts`; gate 4 (each shape defined once) must follow |
| 257 | `lib/shell-writes.mts` (hooks/lib) | parses a shell command into writes + a stand-alone `--json` tail | the `--json`/`--selftest` tail and `isMain` (lines 231-257) to the entry shell-writes-cli, `copies`/`printf` helpers to `shell-copies.mts` |
| 257 | `hooks/lib/dup-index.mts` | tokenizer, window hashes, the stored index, clone chains, the judge | `dup-tokens.mts` (`tokenize`, `windows`, regexes), `dup-chains.mts` (`clonesIn`, `chains`) |
| 252 | `hooks/lib/program-writes.mts` | what an inline python/node/perl program writes | `program-sites.mts` (`SITES`, `COPY/MOVE/DELETE/TREE/ASSIGN`, `receiverBefore`, `modeOp`) |
| 250 | `lib/pack-template.mts` | scaffolds pack files (rules, checks, hooks, skills) | `pack-template-hook.mts` for the hook scaffold, checks stay |
Go: no file over 242 lines (`proxy/selftest.go`).
Checked: `wc -l`, then read each file's top-level layout.

### 11. Functions over 50 lines (non-selftest) (M-L)
Measured by brace match on `function` declarations (arrow functions assigned to consts were not measured, so this is a floor):
`resident/pool.mts` `startPool` 113 (closes over queue, slots, failures: split spawn / dispatch / settle); `scripts/measure-release.mts` `touchFirstFunction` 103 and `main` 56;
`synth-creator/hooks/time-guard.mts` `run` 98; `hooks/lib/rust-scan.mts` `itemEnd` 84; `shape-code.mts` `bodyOf` 80; `audio-core/tools/lib/spectrum.mts` `analyse` 77; `lib/doctor.mts` `doctor` 73;
`lib/layout.mts` `buildLayout` 65; `resident.mts` `serve` 62; `function-shapes.mts` `headOf` 62; `scripts/test-changed-graph.mts` `choose` 61; `program-read.mts` `scan` 61; `lib/settings.mts` `syncSettings` 60; `shell-writes.mts` `shellWrites` 57 and `judge` 52;
`tools/shape-symmetry.mts` `runConcept` 53; `run-hooks.mts` `runAll` 52; `lib/sync.mts` `sync` 52; `shell-lex.mts` `lex` 51. Selftest case builders (`eventCases` 77, `pushedCases` 74, `cases()` in `proxy/selftest.go` 97) are tables, left out.
Fix: split the top five by what each stage does; the lexer/scanner ones (`itemEnd`, `bodyOf`, `lex`, `scan`) are state machines, so a split there needs care and a test first. L for all, S-M each.

### 12. `JSON.parse`/`JSON.stringify` in source despite the toJson/parseJson owner (S)
The lint gate only refuses an *added* raw call, so older ones stay: `lib/logs.mts:91`, `lib/hook-fold.mts:24` (compares rows by stringifying; a key-order difference would read as a change), `lib/configs.mts:159`, `lib/switches.mts:28` (stringifies the whole hooks object to search it),
`packs/base/hooks/git-guard.mts:249`, `audio-core/tools/tone-report.mts:36`, `global/hooks/lib/global-hook.mts:25` (global is a separate install, so the parse there is by design: say so in a comment). Fix: `toJson`; for equality compare a normalised form (`hook-fold`) on purpose.

### 13. Dead and over-exported code (S)
Method: for every `export function|const|let|class` in the sources, `git grep -nw` over all tracked files (tests included) outside its own file. 73 had no importer.
- Dead (defined, never called, checked by `git grep -nw`): `lib/workorder.mts` `templateText` (1 reference: its own definition).
- Used only inside their own file but exported (drop `export`): `lib/config-merge.mts` `alwaysPacks`, `chosenPacks`; `lib/configs.mts` `packFits`; `lib/hook-budget.mts` `classTimes`; `lib/planner.mts` `sharedWords`; `lib/kit-lock.mts` `takeOver`; `hook-table.mts` `matchesAll`, `matcherSubjectOf`; `run-claudes.mts` `liveOrdersIn`; `once-only.mts` `copiesIn`; `no-find.mts` `askedFor`; `heartbeat.mts` `mainOf`; `scripts/clean-emitted.mts` `strayEmitted`; `smoothing-checks.mts` `findHandSmoothing`, `smoothingKey`; `user-asks.mts` `askId`, `loadLedger`; `time-state.mts` `listWorktrees`; `prove-a-bank.mts` `proveBank`; `route-judge.mts` `routesOf`; `shape-symmetry.mts` `runConcept`, `testName`, `manyConcepts`; `build-sweep.mts` `quietMinOf`, `lowGbOf`, `sweepReport`; and the constants `HOOK_BUDGET`, `EVENT_CLASSES`, `WORST_MS`, `STOP_WORST_MS`, `WALL_BUDGET_S`, `TS_VERSION`, `SHARED_FILE`, `STOCK_KEYS`, `TREE_CAP`, `STOP_CACHE_MS`, `STOP_LIVE_MS`, `MAX_WORDS`, `GRACE_MS`, `DEFAULT_EXCLUDE`, `UNSUPPORTED`, `GROUPS`, `STANDARD_SETTINGS`, `CHECKS`, `FORMULAS`. Several are likely deliberate (a hook module exports its constants for its own selftest in another file); the full list of 73 is reproducible by the same method. Check each before cutting.
- About 30 more exported `interface`/`type` names have no importer (for example `SwitchOptions`, `NewOptions`, `InstallOptions`, `LogsSummary`, `HookSummary`, `PackSpec`); harmless, but each is a name a reader assumes is shared.

### 14. Magic numbers with meaning (S)
`lib/kit-lock.mts` `LEASE_MIN` is named; but `scripts/release-state.mts:76` `timeoutMs: 300_000`, `git-run.mts:34` `64 * 1024 * 1024`, `run-discovery.mts` `BIG`, `elements.mts:100` `400_000`, `dup-index.mts` `COMMON = 40`/`MAX_BYTES` are named or one-offs;
the unnamed ones that carry a meaning: `300_000` (a push's patience), `400_000` (the largest source the elements reader will take; `dup-index` uses `512 * 1024` for the same idea: two limits for "too big to be hand-written code"), `code-shapes`/`stop-look` mixed `LIVE_MS` variants. Fix: one `MAX_SOURCE_BYTES` in `files.mts`; name the push timeout. S.
Checked: read the lines cited.

### 15. Go proxy swallows errors it can state (S)
`proxy/main.go:27-28` (`io.ReadAll(os.Stdin)`, `os.Getwd()` errors dropped), `proxy/daemon.go:55` (`ReadString` error dropped: a daemon that never says ready reads as a ready one with an empty line), `proxy/client.go:109,112,157,206`. Most are fail-open by design (the proxy's contract is to never block on its own fault), but none says so in a comment, and `daemon.go:55` should log. Fix: a comment per site, and one log line at `daemon.go:55`.
Checked: read the lines; did not run the Go tests.

### 16. `shell-writes.mts` is a library that also is a program (S)
`packs/base/hooks/lib/shell-writes.mts:231-257` reads `process.argv`, `process.stdin`, `process.env`, `process.exitCode` and writes `process.stdout`, behind its own `isMain` copy (finding 9). Gate 11/12 of `repo-lint.test.mts` pass because the reads sit inside an `isMain` block, but a hook lib holding an entry point is the shape the gate exists to prevent; the `--json` mode is how the proxy or the old Python side reads writes. It also builds `{path, op, ...afterText(w)}` with a raw `JSON.stringify`.
Fix: move the tail into `hooks/shell-writes-cli.mts` (an entry), keep the lib pure; this also shaves 27 lines (finding 10).
Checked: read lines 228-257; grep for `process.` in hook libs found otherwise only `hook-log.mts` (the runner entry itself) and `resident.mts` (an entry).

## Not found (checked)
- Empty catches: 41 `catch {}` in sources; every one has a comment saying why (grep for `catch { }` with no comment returned none).
- Floating promises: none found by grep (`.then(`/`.catch(` on its own line); `shell-writes.mts:247` uses `.then` to set `process.exitCode` (finding 16).
- Process globals in hook libs outside entries: only the ones named in findings 9 and 16 and the runner entries.

## Status
DONE_WITH_CONCERNS: concern is that findings 11 and 13 are floors from grep and brace counting (arrow functions and test-only exports were not exhaustively checked), and `dup scan` was not run.
