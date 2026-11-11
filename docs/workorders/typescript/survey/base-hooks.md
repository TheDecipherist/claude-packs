# Survey: packs/base hooks, hooks/lib and tools (for the TypeScript conversion)

Branch work/2.0.0-typescript, read only. Counts come from grep and one throwaway reader script over the files; no hook, selftest or test was run. Spawn counts in section 4 are counted from call sites in the selftest code, not measured.

Size: 26 hooks (`packs/base/hooks/*.mjs`, 3045 lines), 60 lib modules (`packs/base/hooks/lib/*.mjs`, 5150 lines, plus `lib/house.py`), 9 tools (`packs/base/tools/*.mjs`, 762 lines). Largest files: `hooks/making-check.mjs` 253, `hooks/lib/shape.mjs` 274, `hooks/lib/pushed.mjs` 248, `hooks/lib/run-status.mjs` 239, `hooks/lib/shell-writes.mjs` 234, `hooks/lib/git-guard-selftest.mjs` 231. No file uses JSDoc `@param`/`@type`/`@returns` (grep: 0 hits), so there is no type information to carry over. No file uses `arguments`, `.apply` or `this`.

## 1. Import graph of hooks/lib

Edges are static `from './x.mjs'` plus dynamic `import('./x.mjs')`. Four dynamic edges exist, all hook or lib to its own selftest module: `shell-writes.mjs` to `shell-writes-selftest.mjs`, `git-guard.mjs` to `lib/git-guard-selftest.mjs`, `kit-fresh.mjs` to `lib/kit-fresh-selftest.mjs`, `making-check.mjs` to `lib/making-check-selftest.mjs`. `look-gate.mjs` and `skill-first.mjs` import their selftest module statically, so it loads on every real hook run (the other four load it only under `--selftest`).

**Leaves (import no lib module): 20 of 60.** apply-edit, audience, build-slots, command-prefix, compile-cache, core-budget, cpp-scan, crash-policy, git-adds, glob, identifier-runs, layout, own-processes, program-read, project, prose, run-claudes, rust-scan, secret-patterns, shell-lex. Add `selftest.mjs` (imports only node:*, no lib) and the count is 21 at depth 0.

**Hubs (imported by 10 or more files, counting hooks, lib and tools):**

| Module | Lines | Importers | Of which hooks / lib / tools |
|---|---|---|---|
| `lib/hook-log.mjs` | 100 | 27 | 26 / 1 / 0 (the `isMain`/`asHook` home; 25 hooks plus the runner) |
| `lib/selftest.mjs` | 51 | 27 | 19 / 7 / 1 |
| `lib/project.mjs` | 81 | 23 | 21 / 2 / 0 |
| `lib/writes.mjs` | 71 | 20 | 19 / 1 / 0 |
| `lib/glob.mjs` | 33 | 16 | 11 / 5 / 0 |
| `lib/layout.mjs` | 58 | 16 | 15 / 1 / 0 |
| `lib/json.mjs` | 66 | 14 | 2 / 8 / 4 |
| `lib/languages.mjs` | 69 | 10 | 3 / 7 / 0 |

Below the cut: `shape.mjs` 7, `content.mjs` 6, `code-shapes.mjs` 5, `shell-writes.mjs` 5, `elements.mjs` 5. Only `compile-cache.mjs` and `own-processes.mjs` are imported by nothing in this area (they are read by `packs/cpp/hooks/compile-cache.mjs`, `packs/synth-creator/**` and `tools/quiet-test.mjs`). Six modules are also the public API of other packs: other packs' hooks import `hook-log` (19 times), `selftest` (14), `writes` (12), `project` (11), `layout` (9), `glob` (8) (grep over `packs/*` minus base). The CLI (`lib/doctor.mjs` and others) imports 19 distinct base lib modules (grep `base/hooks/lib/` in `lib scripts bin`: shape, layout, json, hook-log, content, glob, dup, run-status, core-budget and ten more). Those 6 + CLI-used modules keep their export names and shapes through the conversion.

**Layers for conversion (depth = longest static path to a leaf; leaves first):**

- L0 (21): apply-edit, audience, build-slots, command-prefix, compile-cache, core-budget, cpp-scan, crash-policy, git-adds, glob, identifier-runs, layout, own-processes, program-read, project, prose, run-claudes, rust-scan, secret-patterns, selftest, shell-lex.
- L1 (10): content, dup, event-log, hub-rig, languages, look-gate-selftest, program-writes, run-discovery, shape-lists, skill-first-selftest.
- L2 (7): code-shapes, dup-index, hook-log, making-check-selftest, shape-prose, shell-writes, trunk-lag-selftest.
- L3 (8): elements, function-shapes, json, near-copies, shape, shell-writes-selftest, turn, writes.
- L4 (7): kit-version, pushed, repo-index, run-remotes, run-transcripts, shape-code, unread-writes.
- L5 (5): git-auth, git-guard-selftest, kit-fresh-look, run-status, trunk-lag.
- L6 (2): kit-fresh-selftest, run-tree.
- Then `run-hooks.mjs` (imports crash-policy, event-log, hook-log, unread-writes), then the 25 hooks (fan-in 3 to 12 lib modules each; most: `code-shape.mjs` 12, `template-law.mjs` 12, `once-only.mjs` 10), then the 9 tools (they import `../hooks/lib/` json, run-status, run-tree, kit-version, core-budget, selftest).

Two layering faults that a conversion should fix first, because they push modules up for no reason:
1. `lib/json.mjs` line 6 imports `readText` from `lib/shell-writes.mjs`. That makes the "one JSON helper" depend on the shell parser (json is L3; kit-version, pushed, run-remotes, run-transcripts, run-status, kit-fresh-look and 4 tools sit above it). Moving `readText` to a leaf makes json L0.
2. `lib/hook-log.mjs` (the runner's logger) imports `layout.mjs` and `event-log.mjs` only to read `guards.logs.maxKb`; it is L2 and 26 hooks sit on it.

No import cycles among static edges. `shell-writes.mjs` and `shell-writes-selftest.mjs` are a cycle only through the dynamic import at `shell-writes.mjs` line 224.

## 2. Repetition (helpers with more than one copy)

| Helper | Copies (file:line) | One owner |
|---|---|---|
| git runner | 4 different signatures under the name `git`: `lib/selftest.mjs:14` `git(cwd, ...a)` (stdio ignored, throws); `lib/pushed.mjs:31` `git(cwd, args[], env, input)` (returns string or `{error}`); `hooks/look-gate.mjs:32` `git(root, ...args)` (trim, null on error); `tools/statusline-work.mjs:13` `git(args, cwd)` (arguments reversed). Also `hooks/git-guard.mjs:87` `gitOut(cwd, ...a)` (10 s timeout, null), `lib/kit-fresh-look.mjs:81` `gitIn(root)(...args)` returning `{ok,out,err}`. Inline `execFileSync/spawnSync('git'...)` in `hooks/making-check.mjs:130-131`, `hooks/repo-litter.mjs:37`, `hooks/secrets-guard.mjs:34,55`, `hooks/suite-once.mjs:37`, `lib/run-discovery.mjs:76,88,93`, `lib/shape-prose.mjs:69`. 14 files spawn git; 6 wrappers, 4 signatures. | new `lib/git-run.mjs` (leaf) with one result type; `selftest.mjs` keeps only the commit-identity wrapper |
| write a file (`put`) | `lib/selftest.mjs:13` `put` (mkdir -p + write); `lib/json.mjs:59` `writeJson` (part file + rename); `lib/hook-log.mjs` `appendRotated`; `lib/dup-index.mjs:~111` and `lib/repo-index.mjs` each write a temp file and rename by hand; `lib/crash-policy.mjs:hold` mkdir + write. `put` is also imported by the selftest libs and `packs/*` hooks. | `lib/json.mjs` / a new `lib/files.mjs` (`writeText`, `ensureDir`) |
| JSON read | `lib/json.mjs` `readJson`/`parseJson` is the owner (used by 14 files). Hand-rolled `JSON.parse(readFileSync(...))` in `lib/layout.mjs:9`, `lib/core-budget.mjs:12`, `lib/crash-policy.mjs:21`, `lib/event-log.mjs:49`, `lib/dup-index.mjs:92`, `lib/repo-index.mjs:41`, `lib/shape.mjs:72`, `hooks/lesson-checks.mjs:41,61,62`, `hooks/making-check.mjs:227`, `tools/shape-symmetry.mjs:25`, `tools/test-verdict.mjs:35`. 27 files contain `JSON.parse`. `test/json-ratchet.test.mjs` exists to hold a count. | `lib/json.mjs` (after it becomes a leaf) |
| text read with null | `readText` exists twice with different meaning: `lib/shell-writes.mjs:30` (file, 8 MB cap, null) and `lib/repo-index.mjs:28` `readText(text, rel)` (a shapes reader). Also `run-status.mjs:26` `textIn`. | rename the repo-index one; the file reader moves to `files.mjs` |
| real path | `lib/dup.mjs:81` `real` (walks up for a missing path), `lib/hook-log.mjs:50` and `lib/project.mjs:32` (identical: realpath or resolve), `hooks/git-guard.mjs:88` is a different thing named `real` (the env bag). | `lib/project.mjs` exports one `real` |
| regex escape | `esc` identical at `hooks/git-guard.mjs:100`, `lib/git-auth.mjs:12`, `lib/shape.mjs:34` | `lib/glob.mjs` |
| isDir | `lib/program-writes.mjs:20`, `lib/shell-writes.mjs:39` identical | files.mjs |
| short hash | `createHash('sha1')...slice(0,N)` 9 times: `look-gate.mjs:45`, `making-check.mjs:228`, `skill-first.mjs:79`, `code-shapes.mjs:27`, `near-copies.mjs:16`, `crash-policy.mjs:17`, `event-log.mjs:64`, `repo-index.mjs:36`, `dup-index.mjs:70`, `tools/statusline-work.mjs:46` | `lib/hash.mjs` `shortHash(text, n)` |
| temp folder | `mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), ...))` in `run-hooks.mjs:93`, `dup.mjs:86`, `dup-index.mjs:188`, `hub-rig.mjs:15`, `selftest.mjs:18` (this one without TMPDIR), `kit-fresh-selftest.mjs:24,65`, `shell-writes-selftest.mjs:54` | `selftest.mjs` `scratchDir()` |
| project root | `const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()` unresolved in `folder-law.mjs:16`, `file-size-guard.mjs:18`, `lesson-checks.mjs:31`, `placement-law.mjs:16`; resolved in `lib/project.mjs:7`; function form `projectRoot()` in `hook-log.mjs:51` | `project.mjs` (`ROOT`) and `hook-log.mjs` `projectRoot()` collapse into one |
| payload prelude | four forms, see below | `lib/writes.mjs` `readPayload` + `judgeEvent` |
| runner path + spawn | `RUNNER = fileURLToPath(new URL('../run-hooks.mjs', import.meta.url))` at `selftest.mjs:27`, `hub-rig.mjs:12`, `kit-fresh-selftest.mjs:14`; each followed by its own `spawnSync(process.execPath, [RUNNER, hook], {input, env: {CLAUDE_PROJECT_DIR}})` (`selftest.mjs:28`, `hub-rig.mjs:25`, `kit-fresh-selftest.mjs:15`; `look-gate-selftest.mjs` spawns the hook directly twice) | `selftest.mjs` `runHook` returning the full result (today it returns only `.status`, which is why hub-rig and kit-fresh made their own) |
| selftest skeleton | `const hook = fileURLToPath(import.meta.url);` opens 15 hooks' selftests; the tail `export const hook = main; if (isMain(...)) process.exit(--selftest ? selftest() : await asHook('<name>', main))` is written out 24 times with the hook name typed again | `hook-log.mjs` `runAsMain(import.meta.url, name, main, selftest)` |
| result reporting | `verdicts(name, cases)` in `selftest.mjs` is used by 18 hooks, 5 selftest libs and 1 tool; hand-rolled "selftest FAILED" loops in `making.mjs`, `run-hooks.mjs`, `git-guard-selftest.mjs`, `shell-writes-selftest.mjs`, `lesson-checks.mjs`, `tools/test-verdict.mjs` | `verdicts` |

Payload prelude, per hook (grep of `JSON.parse(text` / `readPayload(text` / `judgeEvent(text` / `parseJson(text`):
- `judgeEvent` (`lib/writes.mjs:55`): 9 hooks (code-shape, dispatch-once, folder-law, no-find, repo-litter, secrets-guard, suite-once, template-law, untrusted-boundary). `no-find.mjs` and `suite-once.mjs` also call `readPayload` on the same text, so they parse twice.
- `readPayload` (`lib/writes.mjs:48`): agents-held, inside-the-project, look-gate, once-only, skill-first (plus the two above).
- `parseJson(text)`: heartbeat, kit-fresh.
- raw `try { JSON.parse(text) } catch { return 0 }`: brief-guard:39, file-size-guard:36, git-guard:179, lesson-checks:154, making-check:238, placement-law:39, shape-law:42. `making.mjs:93` and `reuse-hint.mjs:50` use `JSON.parse(text || '{}')`; `reuse-hint.mjs` has no try, so bad JSON throws and the runner records a crash.
- The runner itself parses the same text again at `run-hooks.mjs:55` and `:135`, and `hook-log.mjs:80` and `event-log.mjs:57` a third and fourth time.

## 3. Hook structure against the CLAUDE.md form

The form is `export const hook = main` + `if (isMain(import.meta.url)) process.exit(--selftest ? selftest() : await asHook(name, main))`. 18 of 26 follow it to the letter (a one-line `if`, a local `selftest()`): agents-held, brief-guard, code-shape, dispatch-once, file-size-guard, folder-law, heartbeat, inside-the-project, no-find, once-only, placement-law, repo-litter, reuse-hint, secrets-guard, shape-law, suite-once, template-law, untrusted-boundary. The runner `run-hooks.mjs` has no `hook` export by design. Differences:

| File | How it differs |
|---|---|
| `hooks/git-guard.mjs:212` | selftest is not local: `await (await import('./lib/git-guard-selftest.mjs')).selftest(fileURLToPath(import.meta.url), { problem, house })`, async, takes the hook path and two of the hook's own functions |
| `hooks/kit-fresh.mjs:47-51` | block form; `export const hook = main` has no comment; adds `--check` mode; selftest loaded with `const { selftest } = cond ? await import(...) : {}` |
| `hooks/look-gate.mjs:111-113` | `--key <name>` mode ahead of selftest; selftest imported statically; selftest takes the hook path; reads `process.argv` at module top level (`keyAt`) |
| `hooks/making.mjs:102-106` | `--cost` mode; selftest local but reports by its own loop, not `verdicts` |
| `hooks/making-check.mjs:250-253` | `async function main` (the only async hook); selftest dynamic, takes `import.meta.url` (a URL) where the others take a path |
| `hooks/lesson-checks.mjs:184` | `selftestMain` plus `selftest(checks)`: lints the installed lesson-check JSON files and returns a list of problems; spawns nothing |
| `hooks/skill-first.mjs:121` | selftest from `lib/skill-first-selftest.mjs`, imported statically, takes the hook path |
| `hooks/run-hooks.mjs` | the runner; own async `selftest` and an `isMain` block that runs `runAll` |

Four of the 18 selftests (`file-size-guard`, `placement-law`, `reuse-hint`, `making`) call pure functions and start no process. Six hooks define `main` as `const main = (text) => judgeEvent(...)`; the rest use `function main(text)`. `main`'s return is not typed anywhere; the runner (`run-hooks.mjs:75`) accepts a number, a promise of one, or anything else (non-integers become 0).

## 4. Selftests: what they build and what they cost

Method: each `runHook(...)` or equivalent helper call is one node process (the runner, which imports the hook in the same process). Add explicit `git`/`spawnSync` calls in the selftest code. "Hook-side" is what the hook itself spawns per call (git, jscpd), counted from the hook source. Hooks not listed spawn nothing: `file-size-guard`, `placement-law`, `reuse-hint`, `making`, `lesson-checks` (pure functions or file reads), `run-hooks` (calls `runAll` in process, no child).

Ten most expensive by spawn count:

| # | Hook (selftest file) | Runner spawns | Other child processes in selftest code | Hook-side per call | What it builds |
|---|---|---|---|---|---|
| 1 | git-guard (`lib/git-guard-selftest.mjs` 231, `hub-rig.mjs` 30, `trunk-lag-selftest.mjs` 50) | ~31 (10 bash, 18 stop, 3 direct) | ~72 git (14+9 `git(`, 10 `commit()` = 2 each, 17 `push()`, 3 hub repos x 4 init/remote) | up to 5 git (status, rev-parse, remote get-url, rev-list, ls-remote) | 3 real repos each with a bare "GitHub", worktrees, 100 more cases in process |
| 2 | shape-law (`hooks/shape-law.mjs`) | 57 | 0 | possibly one `git grep` per generator name (`lib/shape-prose.mjs:69`, via `declaredAmount`) | scratch project with `design/shape.json`, no git |
| 3 | making-check (`lib/making-check-selftest.mjs` 121) | ~46 (40 `turn(` + 2 `sendBacks` x 3) | 3 git (init, add, commit) | 2 git (`ls-files`, `diff`) + `jscpd` on written source (`dup.mjs:92`, 8 s timeout) | git repo with `build.md`, a transcript rewritten every turn |
| 4 | look-gate (`lib/look-gate-selftest.mjs` 51) | 7 land + 2 saidAfter + 7 `key()` + 1 `head()` = 17 | 11 git + 7 `commit()` (2 each) = 25 | 3 to 5 git per landing | repo with 7 branches |
| 5 | once-only (`hooks/once-only.mjs`) | 18 | 0 | 1 `jscpd` per judged write | scratch project; refuses to run without `jscpd` |
| 6 | suite-once (`hooks/suite-once.mjs`) | ~29 | 3 git | 1 `git status` per command (`suite-once.mjs:37`) | git repo, 3 transcript files |
| 7 | kit-fresh (`lib/kit-fresh-selftest.mjs` 93) | 2 | 29 git (2 `kitRepo()` x 11, 7 other) | up to 4 git per `atStart/atCommit` (fetch, rev-parse...) | 2 repos each with a bare origin; `npm` stubbed |
| 8 | template-law (`hooks/template-law.mjs`) | 26 | 0 | 0 | scratch project |
| 9 | secrets-guard (`hooks/secrets-guard.mjs`) | 16 | 4 git + 2 `touch` | 1 `git check-ignore` / `ls-files` per call | 2 git repos |
| 10 | brief-guard (`hooks/brief-guard.mjs`) / inside-the-project / no-find | 22 / 16 + 6 git / 19 | 0 / 6 git / 0 | 0 | scratch projects (inside-the-project: a repo with a worktree and a clone) |

Next: code-shape 19, dispatch-once 16, folder-law 16, skill-first 15, repo-litter 10 (+1 git), heartbeat 10, agents-held 9 plus 3 `sh` shells that start a stand-in `claude`, untrusted-boundary 8. Total across the 25 hooks: about 390 runner spawns, about 180 selftest-side git processes, plus the hook-side git and jscpd. `doctor` runs every one of them unless `selftest-cache.mjs` has the hash.

The cache hash (`lib/selftest-cache.mjs` `sharedHash`) covers every file of `hooks/lib` plus the runner plus the project's guards. So one edit to any of the 60 lib modules invalidates the cached proof of all 25 hooks, although a lib change reaches at most the hooks that import it (section 7).

Two selftests depend on an optional install: `once-only` and `making-check` fail without `jscpd` (`once-only.mjs` selftest head; `making-check-selftest.mjs:20`).

## 5. Shapes with no single definition

**Hook event payload.** Parsed in 4 forms (section 2); no module declares it. Fields read, with count of reading files: `cwd` 24, `hook_event_name` 18, `tool_name` 17, `tool_input` 16, `agent_id` 9, `transcript_path` 8, `prompt` 4, `source` 3, `session_id` 3, and once each `permission_mode`, `last_assistant_message`, `agent_type`, `agent_transcript_path`, `stop_hook_active` (git-guard Stop). `tool_input` is a different record per tool: Bash `{command, run_in_background}`; Write `{file_path, content}`; Edit `{file_path, old_string, new_string}`; MultiEdit `{file_path, edits[]}`; NotebookEdit `{notebook_path, new_source, edit_mode}`; Read `{file_path}`; Skill `{skill}`; Agent/Task `{description, prompt, run_in_background}`; Grep `{pattern, path}`. Readers: `lib/writes.mjs:writesOf`, `lib/apply-edit.mjs`, `lib/event-log.mjs:36` (content/new_string/new_source), `lib/crash-policy.mjs`, `lib/unread-writes.mjs`, and every hook in the table above.

**A write.** Four shapes with the same name in the code:
1. `writesOf` row (`lib/writes.mjs`): `{ path, op, before, after }`, op one of write, edit, append, copy, move, link, truncate, touch, delete; `after` is string or null. 20 importers read it.
2. `shellWrites` row (`lib/shell-writes.mjs`, built by `add(path, op, content, extra)`): `{ path, op, content: string|null, sed?: {flags, scripts}|null, from? }`; `afterText(w, before)` turns it into `{before, after}`. `lib/program-writes.mjs` produces `{path, op, content, from?}` for it.
3. `writesOfTurn` row (`lib/turn.mjs:80`): `{ path, text, tool }`; the text is `null` when unknown.
4. Rows made by hand: `making-check.mjs:200` `{ path, after, ranges }`; `lib/dup-index.mjs:clonesIn` reads `w.path`, `w.after`, `w.ranges ?? [w.range]` (two range forms); `hooks/once-only.mjs:58` builds `{path, after, range}` from `changedLines` (`dup.mjs`).

**Layout (`.claude/layout.json`).** Read by `lib/layout.mjs:readLayout` (21 call sites; fallback `{folders:{}, concepts:{}}`), and raw by `tools/test-verdict.mjs:35` and `lib/event-log.mjs`. Fields assumed by readers:
- `folders: { name: { path, purpose?, kind? } }` (layout.mjs, folder-law:41 without a `?? {}` guard while 6 others have one, placement-law, making-check:37, dup.mjs:48, elements.mjs:63)
- `concepts: { name: (folderName | "kind:x" | glob)[] }` (layout.mjs)
- `kinds: { name: { what, in, concepts[], content?, files[]?, extensions[]? } }` (placement-law)
- `files: { alias: path }` (layout.resolveAliases); `protected: string[]` (dispatch-once:70, elements:63); `maxFileLines` (file-size-guard:40); `sourceFiles` regex string (folder-law:20); `commands: { test, 'test-changed' }` (suite-once:56, test-verdict:35); `looks: [{ name, reference, code[], report? }]` (look-gate:37); `enable: string[]` (git-guard:183 tests for `'guards/git-house'`)
- `guards.git: { house, owner, tokenVar, ghAuth, trunkNeedsYes, pushNeedsYes, trunks[], refuseTrunk, neverStage[], safeRestore, branchStart, accountNote, repo, cachedOnly }` (git-guard DEFAULTS:72-84, pushed.mjs, trunk-lag.mjs)
- `guards.codeShape: { maxLineChars, maxStatementsPerLine, maxFunctionStatements, maxParameters, exclude[] }`; `guards.templates.exclude[]`; `guards.content[]` (content.mjs:11); `guards.repoLitter: { allow[], maxFileMb }`; `guards.circuitSkill.sources[]`; `guards.skillFirst: [{ skill, sources[] }]`; `guards.buildq.cores`; `guards.logs.maxKb` (hook-log:23)
- Keys the CLI reads and this area does not: `configuration`, `complete`, `disable`, `siblings`, `paramIds`, `writeOnce`.

**Lock (`.claude/claude-packs.lock.json`).** Written by `lib/sync.mjs:131`; read here by `lib/event-log.mjs:49-50` (`kit`, `files[".claude/hooks/<hook>.mjs"]`, raw `JSON.parse` inside a try) and `lib/kit-version.mjs:20` (`kit`, via `readJson`). Fields the writer produces: `kit`, `packs[]`, `installed[]`, `files{rel: sha256}`, optional `sources`. `lib/manifest.mjs:readLock` defaults to `{packs:[], files:{}}`; this area's readers default differently (null).

**design/shape.json.** Read by `lib/shape.mjs:readShape` (returns null if absent, `{concepts:{}, exclude:[], error}` if it does not parse, else `{concepts, exclude, values:Set, json}` from `normaliseShape`), by `tools/shape-symmetry.mjs:22` `readManifest` (raw JSON, throws if absent), by `hooks/making-check.mjs`, `hooks/brief-guard.mjs`, `hooks/shape-law.mjs`, `hooks/making.mjs`, `lib/shape-code.mjs`, `lib/shape-prose.mjs`, `lib/dup.mjs` (`exclude`), `hooks/once-only.mjs`. Top level: `concepts`, `exclude[]`, `values[]`. A concept row: `shape` (one | many | ids), `count?`, `id?`, `generator?`, `words[]`, `names[]`, `selectors{name: why}`, `constants{name: {instance, reason}}`, `patterns[]`, `arrays[]`, `senses[]`, `symmetry: { members, instances?, first?, swap commands }` (the last only in `tools/shape-symmetry.mjs`). `compile` (`shape.mjs:42`) adds derived `plural`, `single`, `generatorName`, `quotes`, `badPatterns`. The error variant lacks `values` and `json`.

**Pack manifest (`pack.json`).** No reader in this area. Readers are outside: `lib/pack-manifest.mjs` (version, description, type stock|custom, author, license, repository.url, name equal to its folder), `lib/packs.mjs` and `lib/switches.mjs` (`folders`, `concepts`, `kinds`, `hooks`, `optIn`, `skillsIn`, `engines`). `test/worktrees.test.mjs:10` imports `readJson` from this area to read them.

## 6. What breaks under strict TypeScript

- **Open property bags typed by use:** `readLayout()` (`layout.mjs`) returns parsed JSON or a two-key default; 12+ sites do `layout.guards?.x?.y ?? default`. `shape` is `null | full | error-variant`. Needs one `Layout` interface with every field optional, and `Shape` as a discriminated union.
- **Values that are sometimes null, by design:** `readText` (null), `readShape` (null), `look-gate.mjs:git` (null), `git-guard.mjs:gitOut` (null), `project.mjs:commonGitDir` (null), `unpushed()` in `pushed.mjs:120` returns `null | {error} | {branch, url, commits}` and `git-guard.mjs:157` tests `u?.error`; `pushed.mjs:git` returns `string | {error}` and a helper `out(r)` narrows by `typeof`; `kit-fresh-look.mjs:atStart/atCommit` return `null | {say, block}`; `heartbeat.mjs` name is `string | null`; `afterText` returns `after: string | null`.
- **Same name, differing arity or order:** the four `git` functions (section 2); `afterText(w, before = readText(w.path) ?? '')` is called with 1 or 2 arguments (`writes.mjs`), the default reads an earlier parameter; `runHook(hook, dir, payload, args = [])` is called with `payload` null (heartbeat's selftest) and returns `.status` which is `number | null`; `hubRepo().run(hookFile, payload, cwd = dir, project = dir)`; `commit(msg, cwd = dir)`; `judgeEvent(text, {name, command, write})` takes callbacks of different arities (`command(cmd, cwd)`, `write(w, rel)`).
- **Selftest signatures all differ:** `selftest(): number` (most), `selftest(hookPath): number` (look-gate, skill-first), `selftest(hookUrl): Promise<number>` (making-check), `selftest(hookFile, {problem, house}): Promise<number>` (git-guard), `selftest(checks): string[]` (lesson-checks). `kit-fresh.mjs:49` destructures `selftest` from `cond ? await import() : {}`, which strict mode rejects (property missing on `{}`).
- **`verdicts(name, cases)`** (`selftest.mjs`): each row is `[label, got, want]` with `got` a number, boolean, string, null or undefined, compared by `!==`. Needs `unknown`.
- **Dependency-injected env bags with partial overrides:** `git-guard.mjs:88` `real = { login, dirty, branch, hasHead, remoteUrl, merging, unpushed, warn? }`; the selftest builds `{...isDirty, merging: () => true}` and calls `env.warn?.()`. Needs an interface with optional members.
- **Global mutation:** `hook-log.mjs:asHook:87` and `run-hooks.mjs:capture` reassign `process.stderr.write` / `process.stdout.write` with `(chunk, ...rest)`; `agents-held.mjs:68,99` assign and `delete process.env.CLAUDE_PACKS_UNATTENDED`; `shell-writes.mjs` caches `let gnuSed` as `undefined | string | null`; module singletons `limits` Map (`hook-log.mjs`), `made[]` (`selftest.mjs`). `project.mjs:7` reads `process.env` at import time, so `ROOT` is frozen at first import in the runner's single process.
- **Records that are unions by tool:** `payload.tool_input.<field>` with 12 different fields (section 5); `writes.mjs:writesOf` branches on `tool` string; `program-writes.mjs` handles carry `{site, parts, ok, uses}` objects mutated through `site.content` (lines 128-167).
- **Dynamic imports and top-level await** in 26 files (`await asHook`, `await import`); the runner calls `mod.hook` on a module of unknown type (`run-hooks.mjs:72`).
- **Range forms:** `dup-index.mjs:clonesIn` reads `w.ranges ?? [w.range]`.

## 7. Which tests a hook change reaches

How a hook is proved today:
1. its `--selftest` (all 25 hooks have one; `lib/doctor.mjs` runs them; cached by `lib/selftest-cache.mjs` on a hash of the whole of `hooks/lib`);
2. `test/worktrees.test.mjs` `CASES` (line 41): one case per installed hook, asserted complete at `:225` (`every installed hook needs a worktree case`). Base hooks are split over three files: 18 in `worktrees.test.mjs` (brief-guard, code-shape, dispatch-once, file-size-guard, folder-law, git-guard, heartbeat, lesson-checks, making-check, making, once-only, placement-law, reuse-hint, run-hooks, secrets-guard, shape-law, template-law, untrusted-boundary), 8 in `test/worktree-cases-commands.mjs` (agents-held, inside-the-project, kit-fresh, look-gate, no-find, repo-litter, skill-first, suite-once), and the other packs' hooks in `test/worktree-cases-packs.mjs`;
3. tests that name the hook by file name. Counted by grep of `<hook>.mjs`: git-guard 9 test files, folder-law 9, lesson-checks 12, shape-law 8, secrets-guard 8, once-only 6, file-size-guard 5, placement-law 5, code-shape 4, template-law 4, dispatch-once 5; agents-held, inside-the-project, skill-first, reuse-hint, heartbeat have only the worktree case (and `noop.test.mjs`). `test/noop.test.mjs` names every hook and is reached by any change under `packs/`.

What already decides "this changed, run these": `scripts/test-changed.mjs` (281 lines). A test covers a file by static import, `import()` or `new URL(.., import.meta.url)` (transitively), by a path literal, by a distinctive basename in its text, and by `TABLE` (line 59). `selftestsOf` (line 169) returns each changed hook plus every hook that imports a changed lib, by walking the import graph; `proveHooks` runs only those selftests. So the mapping exists, but it is recomputed by regex from source text on each run, and its two weak spots are in this area: (a) the basename match, which misses any test that builds the hook name (`noop`, `hook-proof`, `hook-timing` loop over `readdirSync`), so those are reached only through `noopOf`; (b) `selftest-cache.mjs` and `selftestsOf` disagree: the cache invalidates all 25 on any lib edit, `selftestsOf` is exact.

Hub effect: a change to `hook-log`, `selftest`, `project`, `writes`, `glob` or `layout` reaches 11 to 26 hook selftests and, through `noop`, every installed-file test. A change to a leaf such as `secret-patterns.mjs` reaches `event-log` then `run-hooks` then every hook through the runner (the import graph passes through `event-log`, which `run-hooks` and `hook-log` import), so even that is "all".

Structure that makes the lookup one line: a checked-in table next to the hooks, `packs/base/hooks/hooks.json`, one row per hook: `{ "name", "events": [...], "selftest": "self" | "lib/<x>-selftest.mjs", "worktreeCase": "<file>", "tests": ["test/<file>"], "libs": [...] }`, with `libs` generated and `tests` asserted by one test that fails if a row is missing or a named test no longer references the hook. Then "hook X changed" is `rows[X].selftest + rows[X].tests`, and "lib Y changed" is the rows whose `libs` contain Y, with no regex over test text. Two supporting moves in the same direction: make the six hub modules (`hook-log`, `selftest`, `project`, `writes`, `glob`, `layout`) small and stable, and move `json.mjs` and the file/git helpers to leaves so most lib changes reach few hooks; and key the selftest cache on the hook plus its own transitive libs instead of the whole directory.

## Most important findings

1. Layering has 21 leaves, 6 hubs of 16 to 27 importers, and 7 levels; `json.mjs` depends on `shell-writes.mjs` for `readText`, which is the first thing to cut.
2. The payload is parsed in four different ways across 25 hooks, and `git` exists with four signatures in 14 files, so these need one typed module each before the hooks are converted.
3. "A write" is four different record shapes; `writesOf` rows (`{path, op, before, after}`) are the one most hooks share.
4. 18 of 26 hooks follow the `hook` + `isMain` form exactly; kit-fresh, look-gate, making, making-check add modes or block forms, and git-guard, lesson-checks, skill-first pass the selftest different arguments.
5. Selftests cost about 390 runner spawns; git-guard alone is about 100 processes. The selftest cache hashes all of `hooks/lib`, while `scripts/test-changed.mjs` already computes the exact hook-to-lib import graph.
