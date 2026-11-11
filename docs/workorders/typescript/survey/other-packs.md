# Survey: every pack other than base, and global/

Read-only survey on branch work/2.0.0-typescript. Every claim names a path. Line counts are `wc -l` of the tracked file. Base's own
code (packs/base/hooks, packs/base/hooks/lib, packs/base/tools) is another survey; it is named here only where other packs copy or import it.

## 0. How a pack file reaches a project (the facts everything below rests on)

- `planFiles` (lib/packs.mjs) walks `packs/<name>/{rules,checks,hooks,tools}` recursively and maps each file to the SAME relative path under
  the project's `.claude/` (`packs/audio-core/hooks/lib/x.mjs` becomes `.claude/hooks/lib/x.mjs`). Skills go under `.claude/skills` (or a layout
  folder's nested `.claude`). Only `.pyc`, `__pycache__`, `.DS_Store` are skipped (`JUNK` in lib/packs.mjs). There is no per-extension filter:
  a `.mts` or `.d.ts` beside a hook would be copied too.
- Every pack's `hooks/lib` and `tools/lib` therefore MERGE into one folder with base's `hooks/lib`. Pack code imports base libs as `./lib/x.mjs`
  (hooks) or `../hooks/lib/x.mjs` (tools), which resolve only in the merged install, never inside `packs/<pack>/`.
- `kitHookScripts()` (lib/packs.mjs), `SCRIPT` (lib/settings.mjs, `[\w-]+\.(?:mjs|py)`), `NODE_HOOK` (lib/settings.mjs, only `.mjs`), the hook list in
  lib/doctor.mjs (`/\.(mjs|py)$/`), `SWITCH` (lib/switches.mjs, `hooks/[\w-]+\.(mjs|py)`), `fileOf` in packs/base/hooks/run-hooks.mjs (appends `.mjs`) all
  recognise a hook by the `.mjs`/`.py` suffix and a flat `hooks/` folder. A hook is not found if it is `.js`, `.mts`, or in a subfolder.
- Hooks run through `run-hooks.mjs`, which `import()`s the hook module and calls `export const hook` (lib/settings.mjs `throughRunner`). A hook that
  cannot be run that way (`async`, `asyncRewake`, no `hook` export, or `.py`) keeps its own `node`/`python3` command line.
- lib/switches.mjs: a hook file is "switched on" per project (new pack: all but `optIn`; existing pack: only if `layout.enable` names it). The names it
  reads are `hooks/<name>.mjs|.py` and `checks/<name>.json`; `optIn` in synth-creator/pack.json is `user-asks`, `idle-wake`, `build-sweep`.
- Tests that need the installed layout lay it out on purpose: scripts/test-changed.mjs `proveHooks` does `cpSync(packs/base/hooks)` then
  `cpSync(packs/<pack>/hooks)` into one scratch `.claude/hooks` and runs `--selftest` there.
- CLAUDE.md: "Hooks run inside the target project, so they import only from `packs/base/hooks/lib/`, never from `lib/`." Verified: no pack file imports `lib/`.

## 1. Inventory (lines)

Packs with NO code, only pack.json + rules/checks/skills (26): ai, ci, content-site, docker, dynamic-data, fastify, go, hook-proof, host-agent,
html-ui, http-api, js-ts, midi, mongo, multi-tenant, nginx, python, react, rust, shell, shell-hooks, stored-text, tui, web, websocket, writing.

| Pack | Hooks (lines) | Pack libs | Tools | pack.json |
|---|---|---|---|---|
| global/ | gnu-shell 131, shell-traps 79, version-pin-guard 284 | hooks/lib/shell-writes.mjs 2 (a re-export of base's) | none | none |
| audio-core | param-id-lock 172, realtime-guard 116, settings-layer 154 | hooks/lib: realtime-checks 56, settings-standard 43, smoothing-checks 132 | tone-report 47; tools/lib: spectrum 112, wav 60 | 197 |
| cpp | compile-cache 63 | none (uses base lib/compile-cache.mjs) | none | 32 |
| full-stack | stack-guard 91 | none | none | 76 |
| gpu-painter | browser-guard.py 196 (the only Python hook) | none (imports base lib/house.py) | none | 91 |
| instrument-shell | none | none | route-table 56; tools/lib: route-judge 104, route-mermaid 38, route-plants 53 | 22 |
| postgres | db-wipe-guard 95 | none | none | 48 |
| reverse-engineering | firmware-out-of-git 50 | none | names-sweep 267, source-ledger 75; tools/lib: multi-find 43, unwrap 119 | 35 |
| sound-design | none | none | prove-a-bank 104; tools/lib: bank-measures 115; tools/vst3host (render.cpp, build.sh, 3 headers; not JS) | 22 |
| stellix | no-shipped-images 88 | none | none | 61 |
| synth-creator | build-guard 241, build-sweep 166, chart-first 100, frozen-files 63, idle-wake 90, protect-vendor 175, spec-lock 117, stage-guard 50, time-guard 249, user-asks 165 | hooks/lib/time-guard-selftest 92 | buildq 65, freeze 36 | 140 |
| ui-craft | none | none | page-measure 41 (browser-side, no imports) | 43 |
| zod | schemas-only 54 | none | none | 44 |

Totals: global 496 lines of JS; packs outside base about 5,900 lines of .mjs/.py (the file list's 6,397 includes 1,500 lines of pack.json).

### Imports that exist only after an install (cannot run or test in place in the repo)

All imports are of base's `hooks/lib` unless noted. A file is "in place" runnable only if every import resolves inside its own pack.

| File | Exact imports that do not resolve in `packs/<pack>/` |
|---|---|
| audio-core/hooks/param-id-lock.mjs | `./lib/glob.mjs`, `./lib/layout.mjs`, `./lib/project.mjs`, `./lib/writes.mjs`, `./lib/selftest.mjs`, `./lib/hook-log.mjs` |
| audio-core/hooks/realtime-guard.mjs | `./lib/writes.mjs`, `./lib/project.mjs`, `./lib/layout.mjs`, `./lib/selftest.mjs`, `./lib/hook-log.mjs` (its `realtime-checks`, `smoothing-checks` ARE pack-local) |
| audio-core/hooks/settings-layer.mjs | `./lib/layout.mjs`, `./lib/project.mjs`, `./lib/shell-writes.mjs`, `./lib/writes.mjs`, `./lib/selftest.mjs`, `./lib/hook-log.mjs` (`settings-standard` is pack-local) |
| audio-core/hooks/lib/realtime-checks.mjs | `./cpp-scan.mjs` |
| audio-core/hooks/lib/smoothing-checks.mjs | `./cpp-scan.mjs`, `./glob.mjs`, `./layout.mjs` |
| cpp/hooks/compile-cache.mjs | `./lib/compile-cache.mjs`, `./lib/selftest.mjs`, `./lib/hook-log.mjs` |
| full-stack/hooks/stack-guard.mjs | `./lib/writes.mjs`, `./lib/selftest.mjs`, `./lib/hook-log.mjs` |
| postgres/hooks/db-wipe-guard.mjs | `./lib/project.mjs`, `./lib/selftest.mjs`, `./lib/writes.mjs`, `./lib/hook-log.mjs` |
| reverse-engineering/hooks/firmware-out-of-git.mjs | `./lib/git-adds.mjs`, `./lib/glob.mjs`, `./lib/layout.mjs`, `./lib/project.mjs`, `./lib/selftest.mjs`, `./lib/writes.mjs`, `./lib/hook-log.mjs` |
| stellix/hooks/no-shipped-images.mjs | `./lib/glob.mjs`, `./lib/layout.mjs`, `./lib/project.mjs`, `./lib/writes.mjs`, `./lib/selftest.mjs`, `./lib/hook-log.mjs` |
| zod/hooks/schemas-only.mjs | `./lib/writes.mjs`, `./lib/glob.mjs`, `./lib/layout.mjs`, `./lib/cpp-scan.mjs` (a C++ scanner, for `blankCode`), `./lib/project.mjs`, `./lib/selftest.mjs`, `./lib/hook-log.mjs` |
| synth-creator/hooks/build-guard.mjs, build-sweep.mjs, user-asks.mjs | `./lib/hook-log.mjs` only |
| synth-creator/hooks/stage-guard.mjs | `./lib/selftest.mjs`, `./lib/hook-log.mjs` |
| synth-creator/hooks/chart-first.mjs | `./lib/glob.mjs`, `./lib/layout.mjs`, `./lib/project.mjs`, `./lib/writes.mjs`, `./lib/selftest.mjs`, `./lib/hook-log.mjs` |
| synth-creator/hooks/frozen-files.mjs, spec-lock.mjs | `./lib/glob.mjs`, `./lib/project.mjs`, `./lib/writes.mjs`, `./lib/selftest.mjs`, `./lib/hook-log.mjs` |
| synth-creator/hooks/protect-vendor.mjs | same plus `./lib/layout.mjs`; also does `import(.../lib/project.mjs?selftest)` at run time (line "const p = await import") |
| synth-creator/hooks/time-guard.mjs | `./lib/layout.mjs`, `./lib/hook-log.mjs`, `./lib/own-processes.mjs`; dynamic `./lib/time-guard-selftest.mjs` (pack-local) |
| synth-creator/hooks/lib/time-guard-selftest.mjs | `./own-processes.mjs` |
| synth-creator/hooks/idle-wake.mjs | `./user-asks.mjs` (a sibling HOOK, same pack; importing it must not run it, see section 3) |
| synth-creator/tools/buildq.mjs | `../hooks/lib/build-slots.mjs`, `../hooks/lib/core-budget.mjs` (a tool reaching into hooks/lib) |
| sound-design/tools/prove-a-bank.mjs | `../hooks/lib/hook-log.mjs` (base) and `./lib/wav.mjs` (AUDIO-CORE's, not sound-design's) |
| sound-design/tools/lib/bank-measures.mjs | `./spectrum.mjs` (AUDIO-CORE's `tools/lib/spectrum.mjs`) |

Self-contained (resolve in place, only own-pack imports): audio-core/tools/tone-report.mjs (`./lib/wav.mjs`, `./lib/spectrum.mjs`), instrument-shell/tools/*
(route-table imports route-judge, route-mermaid, route-plants), reverse-engineering/tools/* (names-sweep, source-ledger, multi-find, unwrap), ui-craft/tools/page-measure.mjs,
synth-creator/tools/freeze.mjs, global/hooks/gnu-shell.mjs and shell-traps.mjs (node built-ins only), global/hooks/version-pin-guard.mjs (see section 4 for its one lib).
Cross-pack hidden dependency: `sound-design` ships a tool that imports audio-core's `wav.mjs` and `spectrum.mjs`, but packs/sound-design/pack.json declares nothing
(no dependency field exists in any pack.json); `init sound-design` alone would install a tool that crashes on import. test/prove-a-bank.test.mjs says it runs "from an install ... its WAV reader and FFT are audio-core's".

## 2. Repetition across packs and against base

Base already owns: `readPayload`, `judgeEvent`, `writesOf` (packs/base/hooks/lib/writes.mjs), `readLayout`, `conceptGlobs` (layout.mjs), `readJson`/`parseJson`
(json.mjs), `isMain`, `projectRoot`, `asHook` (hook-log.mjs), `cutHeredocs`, `lex` (shell-lex.mjs), `scratchProject`, `runHook`, `verdicts`, `git` (selftest.mjs), `gitAdds`, `matchesAny`.

| Repeated thing | Copies outside base (file) | Base owner that should own it | Note |
|---|---|---|---|
| Read the payload: `try { payload = JSON.parse(text); } catch { return 0; }` | no-shipped-images, realtime-guard, compile-cache, stage-guard, protect-vendor, frozen-files, chart-first, spec-lock (8) | `readPayload` in lib/writes.mjs (used by 8 base hooks) | stack-guard, schemas-only, db-wipe-guard, firmware-out-of-git, settings-layer already use `judgeEvent` |
| `const ROOT = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()` | param-id-lock, settings-layer, no-shipped-images, chart-first, frozen-files, spec-lock, tools/freeze.mjs (7) | `projectRoot()` in lib/hook-log.mjs (resolves), or `ROOT` in lib/project.mjs | build-sweep, time-guard, user-asks, idle-wake spell the same env read inline |
| Read layout.json by hand | synth-creator/hooks/build-sweep.mjs `keptNames`, `buildNames` (two `JSON.parse(readFileSync(.../layout.json))`); user-asks and time-guard read no layout but time-guard uses `readLayout(projectRoot).guards?.time` | `readLayout` (layout.mjs); `readJson` (json.mjs) | house.py `layout()` is the Python twin |
| isMain (real-path compare) | version-pin-guard.mjs `realPath` block; user-asks.mjs `real`; names-sweep.mjs (`import.meta.url.endsWith(basename(argv[1]))`); source-ledger.mjs and route-table.mjs (`pathToFileURL(argv[1]).href`, no realpath: wrong for linked paths, KWB-158) | `isMain` (hook-log.mjs). prove-a-bank already imports it from `../hooks/lib/hook-log.mjs` | version-pin-guard is global (no hooks lib beside it, comment says so) |
| Hook footer: `export const hook = main; if (isMain(import.meta.url)) process.exit(argv.includes('--selftest') ? selftest() : await asHook(name, main))` | 11 pack hooks (schemas-only, realtime-guard, firmware-out-of-git, stack-guard, db-wipe-guard, compile-cache, stage-guard, build-guard, chart-first, frozen-files, build-sweep) plus 19 in base | one `runAsHook(name, main, { selftest, flags })` in hook-log.mjs | param-id-lock, settings-layer, spec-lock, no-shipped-images, protect-vendor, time-guard each add by-hand flags to the same line |
| Selftest skeleton: `scratchProject`, `runHook`, a `cases` array of `[label, got, want]`, `verdicts(name, cases)` | every pack hook above except build-sweep, idle-wake, user-asks, gnu-shell, shell-traps, version-pin-guard, browser-guard.py, which each write their own `bad`/`expect`/`console.error` loop | `verdicts` (selftest.mjs) | seven hand-rolled loops: gnu-shell, shell-traps, version-pin-guard (throws via `eq`), idle-wake, user-asks, build-guard, build-sweep, time-guard-selftest |
| Heredoc body removal | build-guard `stripHeredocs`; shell-traps `noHeredocs`; version-pin-guard `HEREDOC` regex; spec-lock inline regex; time-guard two inline regexes (`run`, `readOnlyCommand`); stack-guard and db-wipe-guard inline regexes; browser-guard.py `blank_heredocs` (8 copies in 7 JS files plus 1 Python) | `cutHeredocs` in lib/shell-lex.mjs (already shipped to global by lib/global.mjs) | each differs slightly: only `<<-` tabs, quoted/unquoted marker, trailing-newline handling |
| Blank quoted strings: `s.replace(/'[^']*'\|"(?:\\.\|[^"\\])*"/g, "''")` | build-guard `blankQuotes` (+ `maskQuotes`), shell-traps `bodyOf`, spec-lock `bare`, db-wipe-guard `body` | `lex` in shell-lex.mjs, or one `blankQuotes` export beside `cutHeredocs` | |
| Split a command into segments (`&&`, `\|\|`, `;`, `\|`, newline) | build-guard `offending`, version-pin-guard `pinsFromCommand` and `installDir`, stack-guard `judgeInstall`, stage-guard `problem`, time-guard `readOnlyCommand`, db-wipe-guard (no split), browser-guard.py `segments` | `lex` (shell-lex.mjs) and `command-prefix.mjs` (strips `env`, `sudo`...) | build-guard's `KEYWORDS`/prefix loop re-implements command-prefix.mjs |
| Parse `npm/pnpm/yarn/bun install|add` | version-pin-guard `pinsFromCommand`; stack-guard `judgeInstall` | one `installedPackages(command)` in a base lib | |
| `CODE = new Set(['.js','.mjs','.cjs','.ts','.mts','.cts','.tsx','.jsx'])` | schemas-only, stack-guard (identical lines) | base lib/elements.mjs `CODE` differs (adds C++, no `.cts`); untrusted-boundary.mjs has a third | name one `JS_EXTENSIONS` |
| `git add -A` / secret-file refusal | stage-guard.mjs (`SECRET`, `-A`, `commit -a`) | base git-guard.mjs (rule 1, same law) and secrets-guard.mjs / lib/secret-patterns.mjs | a second implementation of one law; stage-guard is registered in synth-creator, git-guard in base |
| A git runner | chart-first `execFileSync('git', ['ls-tree'...])`; firmware-out-of-git `spawnSync('git', ['ls-files'...])`; no-shipped-images `execFileSync('git', ['diff'...])`; time-guard `sh(cmd,args,cwd)` | base has `gitOut` (git-guard.mjs, not exported), `git` in look-gate.mjs, lib/pushed.mjs `git`, statusline-work `git`: four more copies | no shared never-throwing `git(cwd, ...args)`; `lib/pushed.mjs` exports one with env/input |
| WAV reading | audio-core/tools/lib/wav.mjs only (also exports `writeWav`, imported by test/prove-a-bank.test.mjs) | stays in audio-core, but sound-design needs it: make it one tools lib both packs install | no copy found; the hazard is the missing dependency |
| Process table / `ps` | time-guard (`own-processes.mjs`, base) and build-guard do not share `sh` | own-processes.mjs is the owner | fine |
| `real` / `realpathSync` path compare | user-asks `real`, version-pin-guard `realPath`, protect-vendor `realpathSync` in selftest | `real` in hook-log.mjs (not exported; `isMain` uses it) | export it |

## 3. Hooks whose form differs from base's; the Python hooks

Base form: shebang, `export const hook = main`, `isMain(import.meta.url)` guard, `--selftest` flag, `asHook(name, main)`, `main(text)` returns an exit code.

| Hook | Deviation |
|---|---|
| global/hooks/gnu-shell.mjs, shell-traps.mjs | no `hook` export, no `isMain`: top-level `process.exit(main())` runs on import. `--selftest` yes. Not run through run-hooks (global install, own settings entry, lib/global.mjs `HOOKS`) |
| global/hooks/version-pin-guard.mjs | no `hook` export; own `isMain`-equivalent (`realPath` compare) and reads stdin by event listeners instead of `asHook`; `--selftest` throws via `eq` (no `verdicts`). Imports `./lib/shell-writes.mjs`, which `global add` copies (lib/global.mjs `FILES`) |
| global/hooks/lib/shell-writes.mjs | `export * from '../../../packs/base/hooks/lib/shell-writes.mjs'` so the global hook runs from the kit folder; the installed copy is the real file, plus program-writes, program-read, command-prefix, shell-lex copied beside it (lib/global.mjs `FILES`) |
| synth-creator/hooks/idle-wake.mjs | no `hook` export, no `isMain`, no `asHook`; top-level `process.exit(await main())` (a Stop hook with `asyncRewake`, so the runner skips it: lib/settings.mjs `runs` excludes `asyncRewake`). `--selftest` is async. It `import`s `./user-asks.mjs` (a hook file used as a library: `asks`, `render`) |
| synth-creator/hooks/user-asks.mjs | has `hook` but its own `real` compare instead of `isMain`; entry is `main(argv)` with `--mark`, `--transcript` modes, `asHook` only for the SessionStart path; exports `asks`, `render`, `mark`, `ledgerFor` (library and hook in one file) |
| synth-creator/hooks/build-sweep.mjs | `hook` plus `--now`; spawns itself detached (`fileURLToPath(import.meta.url)`) and uses `asHook` only on one branch |
| synth-creator/hooks/time-guard.mjs | `hook`, but `--selftest` and `--scan-worktrees` are routed by hand; it spawns itself detached; state in `$TMPDIR/time-guard-<project>` |
| audio-core/hooks/param-id-lock.mjs, settings-layer.mjs | `hook` plus a `BY_HAND` flag table (`--status`, `--init`); settings-layer also `export function problems` (its header says doctor runs `--status`) |
| synth-creator/hooks/spec-lock.mjs | `hook` plus a `cli(args)` mode (`lock`, `unlock`, `status`) |
| synth-creator/hooks/protect-vendor.mjs | `hook`; its selftest is `async` and `(await selftest()) | selftestRepo()` |
| stellix/hooks/no-shipped-images.mjs | `hook` plus `--git-staged` (run from a git pre-commit) |
| instrument-shell/tools/route-table.mjs, reverse-engineering/tools/*, audio-core/tools/tone-report.mjs, synth-creator/tools/* | tools, not hooks: own `main(argv)` and a `COMMANDS` table; only route-table has `--selftest`; tone-report, buildq, freeze run `process.exit(main())` at top level with no guard (importing them runs them) |

### The Python hooks

1. `packs/gpu-painter/hooks/browser-guard.py` (196 lines, a PreToolUse hook on Write|Edit|MultiEdit|NotebookEdit|Bash, timeout 15 s, run as
   `python3 "$CLAUDE_PROJECT_DIR/.claude/hooks/browser-guard.py"`; the only hook that bypasses run-hooks). It refuses a call that starts Chrome/Chromium (binary, `open -a`,
   puppeteer/playwright launch, `connectOverCDP`, `--headless`, `--screenshot`) or writes code that would, judging added lines only. Imports: stdlib `json, os, re, sys, time`,
   and `house` from `.claude/hooks/lib` (installed) or `../../base/hooks/lib` (package: the `sys.path[:0]` line). Uses `house.main_root`, `house.project_root`, `house.guard("browser", DEFAULTS)`,
   `house.shell_writes`, `house.log_hook`. Has its own `segments` shell splitter and `blank_heredocs`. Selftest: 25 planted calls.
2. `packs/base/hooks/lib/house.py` (77 lines, not a hook): `project_root`, `main_root` (strips `/.claude/worktrees/<name>`), `layout`, `guard`, `shell_writes`, `folders_of_kind`, `log_hook`.
   `shell_writes` SHELLS OUT to node: `subprocess.run(["node", <this folder>/shell-writes.mjs, "--json"])`, so the Python hook needs `lib/shell-writes.mjs` (and its imports
   shell-lex, program-writes, program-read, command-prefix) as emitted `.mjs` files next to `house.py`. `log_hook` writes the same tab-separated line as lib/hook-log.mjs.

Port to TypeScript needs: (a) rewrite browser-guard on `judgeEvent`/`writesOf` (it re-implements both), replacing `house.shell_writes` with `shellWrites` and `house.guard` with `readLayout(...).guards.browser`;
(b) the hook then joins run-hooks and the `NODE_HOOK` regex (lib/settings.mjs line 24 matches `.mjs` only; line 4 says "browser-guard.py is the one Python hook left");
(c) retire `FORERUNNERS`/`RETIRED` handling so `browser-guard.py` is removed from existing installs (lib/settings.mjs, as `git-guard.py` already is), update test/house.test.mjs (lines 36, 46, 51 assert `browser-guard.py` and `python3`), and the `.py` branches in lib/switches.mjs, lib/doctor.mjs, lib/packs.mjs; (d) delete `house.py` and `test/noop.test.mjs`'s reviewed entry; (e) its Python regexes (`BIN`, `LAUNCH_BASH`, `CODE`) translate directly; the `(?:...)` and `re.S` flags map to JS `s`; no third-party Python imports.

## 4. How a pack hook reaches base's lib, and what a TypeScript build must emit

- At install: base's `hooks/lib/*.mjs` and every pack's `hooks/lib/*.mjs` are copied flat into `<project>/.claude/hooks/lib/`; hooks to `.claude/hooks/`; tools to `.claude/tools/`
  and `.claude/tools/lib/`. A hook says `./lib/x.mjs`, a tool says `../hooks/lib/x.mjs` (buildq, prove-a-bank) or `./lib/x.mjs` (its own pack's tools/lib, merged with other packs' tools/lib: audio-core and
  sound-design share `.claude/tools/lib/`). Nothing is bundled and there is no import map; resolution is purely by relative path after the copy.
- So the emitted files must keep these relative positions, as `.mjs` (the suffix `NODE_HOOK`, `kitHookScripts`, `SWITCH`, `fileOf`, doctor and the runner all test):
  - `hooks/<name>.mjs` flat (no subfolder; `readdirSync(hooks)` is not recursive in `kitHookScripts`, doctor and `lib/settings.mjs`);
  - `hooks/lib/<name>.mjs` for every shared and pack lib, one folder, no collisions across packs (checked: pack lib names are unique);
  - `tools/<name>.mjs` and `tools/lib/<name>.mjs`;
  - `house.py` and `shell-writes.mjs` side by side if the Python hook survives.
  Type-only imports (`import type`) are erased; any runtime import specifier must say `.mjs` (TS `moduleResolution: nodenext` with `.mjs` specifiers in `.mts` sources emits them unchanged).
- Source `.mts` must NOT sit in `packs/<pack>/hooks|tools` unless excluded, because `planFiles` copies every file there. Either keep sources outside `packs/` (a `src/packs/<pack>/...` mirror built into `packs/`), or
  add an exclusion to `JUNK` (lib/packs.mjs) for `.mts`, `.d.mts` and `.map`. A `.mjs.map` would otherwise be installed and listed in the lock hash table (`.claude/hooks/lib/house.py` already appears in test/fixtures/noop/*/lock.json, so every extra file changes noop fixtures).
- The install rule that the repo's tests exploit (running `packs/**/*.mjs` in place) breaks for a built tree only if the emitted `.mjs` are gitignored: scripts/test-changed.mjs `proveHooks`, `changedNames`, test/file-urls.test.mjs (ROOTS `packs`, `global`) and `selftestsOf` read `packs/**/*.mjs`. Emitting into the same paths and committing them keeps all of them unchanged.
- Global part: lib/global.mjs `FILES` copies named source paths (`../packs/base/hooks/lib/shell-writes.mjs` ...) into `~/.claude/hooks/claude-packs/lib/`; the list would need the emitted paths.
  The re-export stub `global/hooks/lib/shell-writes.mjs` only makes the global hook runnable inside the kit and becomes a path alias in a TS build.

## 5. The tools (packs/*/tools): how each is run

| Tool | Run by | Imports | Selftest |
|---|---|---|---|
| audio-core/tools/tone-report.mjs | skill audio-core/skills/measure-tone/SKILL.md and rules dc-block-after-asymmetry, nonlinear-stages-antialiased, oscillators-bandlimited (as `node .claude/tools/tone-report.mjs file.wav f0`); no test names it | `./lib/wav.mjs`, `./lib/spectrum.mjs` (pack-local) | none |
| audio-core/tools/lib/{wav,spectrum}.mjs | imported by tone-report, prove-a-bank, bank-measures; test/prove-a-bank.test.mjs imports `writeWav` straight from the pack | none | none; covered through prove-a-bank |
| instrument-shell/tools/route-table.mjs (+3 libs) | skills prove-hidden-is-idle, reverse-engineering/skills/menu-map, rule menu-is-one-route-table; test/route-table.test.mjs imports the libs directly from `packs/` | own libs only | `--selftest` (each law catches its plant); a test judges the same plants |
| reverse-engineering/tools/names-sweep.mjs (+ multi-find, unwrap) | skill names-first, rule names-before-code; test/names-sweep.test.mjs runs it | own libs only | none inside; the test is the proof. multi-find has no test of its own (reached through names-sweep) |
| reverse-engineering/tools/source-ledger.mjs | skill source-checklist; test/source-ledger.test.mjs | node built-ins | none inside |
| sound-design/tools/prove-a-bank.mjs (+ bank-measures) | skill design-a-preset, rule presets-are-named-and-neutral; test/prove-a-bank.test.mjs runs it from an install | `../hooks/lib/hook-log.mjs`, audio-core's wav and spectrum | none inside |
| sound-design/tools/vst3host/ | skill bounce-a-plugin; test/vst3host.test.mjs (C++, not part of a TS build) | none | none |
| synth-creator/tools/buildq.mjs | build-guard refuses anything else; skill build-through-the-queue; also the `build`/`test` commands in layout.json; tests core-budget, kf-new-projects, worktree-cases-packs | `../hooks/lib/build-slots.mjs`, `../hooks/lib/core-budget.mjs` | none inside; core-budget.test covers the budget |
| synth-creator/tools/freeze.mjs | hook frozen-files tells the user to run it; rule bug-fix-starts-red (base) | node built-ins | none; test/worktrees.test.mjs and routes.test.mjs exercise the frozen-files hook |
| ui-craft/tools/page-measure.mjs | skill prove-page (in a Playwright `page.evaluate`); test/ui-depth.test.mjs (needs Chrome; skipped otherwise) | none | the test is the proof |

No tool is run by a hook. The one tool-to-hook dependency runs the other way: buildq and prove-a-bank import hook libs.

## 6. Which tests cover each pack's code

Tests that merely mention a name inside a fixture list (for example test/base-neutral.test.mjs scanning every hook for synth words) are left out. "Selftest" means doctor or
`proveHooks` runs the file's `--selftest` (every hook with the word `--selftest`; scripts/test-changed.mjs `selftestsOf`: a changed hook, or a hook importing a changed lib, is proved at the gate).

| Pack | File | Test files that exercise it |
|---|---|---|
| global | gnu-shell, shell-traps | test/global.test.mjs (installs and runs selftests), test/house.test.mjs |
| global | version-pin-guard | test/global.test.mjs, test/routes.test.mjs, test/sub37-wb.test.mjs, test/worktrees.test.mjs (via worktree-rig.mjs) |
| audio-core | realtime-guard | test/routes.test.mjs, test/install.test.mjs, test/worktrees.test.mjs, test/rule-tests.test.mjs; its rule smoothing in noop.test.mjs |
| audio-core | param-id-lock | test/install.test.mjs, test/kf-fail-open.test.mjs, test/routes.test.mjs, test/structure.test.mjs, test/worktrees.test.mjs |
| audio-core | settings-layer, settings-standard | test/worktree-cases-packs.mjs (helper, via test/worktrees.test.mjs), test/planner.test.mjs, noop.test.mjs (file list) |
| audio-core | realtime-checks, smoothing-checks | only through realtime-guard's selftest and noop.test.mjs's file list |
| audio-core | tone-report | none |
| audio-core | tools/lib/wav, spectrum | test/prove-a-bank.test.mjs (via the install) |
| cpp | compile-cache | selftest (doctor/gate) and noop.test.mjs; test/cpp-pack.test.mjs covers the pack's checks |
| full-stack | stack-guard | test/full-stack.test.mjs, review-packs.test.mjs |
| gpu-painter | browser-guard.py | test/house.test.mjs (counts, python3 entry), test/other-projects.test.mjs, test/routes.test.mjs, test/hook-timing.test.mjs, test/worktree-cases-packs.mjs |
| instrument-shell | route-table + libs | test/route-table.test.mjs |
| postgres | db-wipe-guard | test/postgres-pack.test.mjs |
| reverse-engineering | firmware-out-of-git | test/audio-packs.test.mjs, test/worktree-cases-packs.mjs |
| reverse-engineering | names-sweep, unwrap, multi-find | test/names-sweep.test.mjs (multi-find only indirectly), test/what-the-kit-finds.test.mjs |
| reverse-engineering | source-ledger | test/source-ledger.test.mjs |
| sound-design | prove-a-bank, bank-measures | test/prove-a-bank.test.mjs |
| sound-design | vst3host | test/vst3host.test.mjs |
| stellix | no-shipped-images | test/install.test.mjs, test/routes.test.mjs, test/worktree-cases-packs.mjs |
| synth-creator | build-guard | test/house.test.mjs, test/kf-new-projects.test.mjs, test/global.test.mjs, test/worktree-cases-packs.mjs |
| synth-creator | build-sweep | test/kit-guards.test.mjs, test/lock-release.test.mjs, test/layout-owned.test.mjs |
| synth-creator | chart-first | test/layout-owned.test.mjs, test/worktree-cases-packs.mjs |
| synth-creator | frozen-files, spec-lock | test/routes.test.mjs, test/worktrees.test.mjs, test/micro.test.mjs (frozen-files), test/other-projects.test.mjs (spec-lock) |
| synth-creator | idle-wake, user-asks | test/hook-timing.test.mjs, test/kit-guards.test.mjs, test/sub37-wb.test.mjs, test/house.test.mjs, test/install-block.test.mjs (user-asks) |
| synth-creator | protect-vendor | test/routes.test.mjs, test/structure.test.mjs, test/kf-refusals.test.mjs, test/sub37-wb.test.mjs, test/install.test.mjs |
| synth-creator | stage-guard | test/kf-refusals.test.mjs, test/micro.test.mjs, test/worktrees.test.mjs |
| synth-creator | time-guard (+ time-guard-selftest) | test/routes.test.mjs, test/house.test.mjs, test/rule-tests.test.mjs, test/other-projects.test.mjs, test/worktrees.test.mjs |
| synth-creator | buildq | test/core-budget.test.mjs, test/kf-new-projects.test.mjs |
| synth-creator | freeze.mjs | no test runs it; named in test/noop.test.mjs's list |
| ui-craft | page-measure | test/ui-depth.test.mjs (skipped without Chrome) |
| zod | schemas-only | test/full-stack.test.mjs, review-packs.test.mjs |

Code that no test file names or runs (other than the generic noop file-list and doctor selftests): audio-core/tools/tone-report.mjs, synth-creator/tools/freeze.mjs,
reverse-engineering/tools/lib/multi-find.mjs (indirect only). A hook with a selftest but no dedicated test: compile-cache, settings-layer's `problems()`, realtime-checks, smoothing-checks, spec-lock (only through the all-hooks tests).
The 26 code-free packs are covered by test/pack-manifest.test.mjs, structure.test.mjs, install.test.mjs and rule-tests.test.mjs (their rules and checks, not code).

## 7. What would make "this file changed, these tests" exact for packs

Today (scripts/test-changed.mjs): a pack file reaches tests by (a) an import chain, which never exists for hooks because tests install them; (b) a basename mention (`'git-guard.mjs'`), which
fails for `*-guard` names that appear in generic fixtures (build-guard names 7 test files, most only listing hooks); (c) the `TABLE` rows: `packs/` maps every change to noop (which lists every installed file), and
hook add/remove/`pack.json` to the worktree-case test. So a change to `packs/synth-creator/hooks/chart-first.mjs` chooses noop plus whichever tests mention the name; it does prove the hook's own `--selftest` (`selftestsOf`).
A tool change proves nothing by itself: `proveHooks` covers hooks only.

Options, in order of cost:

1. Naming convention: one test per code unit, `test/<pack>-<unit>.test.mjs` or `test/<unit>.test.mjs`, matched by basename (the `lib/` row already does this: `^test/${changed.slice(4,-4)}[.-]`). For packs add a TABLE row `^packs/([\w-]+)/(hooks|tools)/(?:lib/)?([\w-]+)\.mjs$` picking `test/$3.test.mjs` and `test/$1-*.test.mjs`. Existing names already fit for names-sweep, source-ledger, prove-a-bank, route-table, vst3host, postgres-pack, full-stack; hooks would need splitting out of routes/worktrees/noop.
2. A manifest field in pack.json (preferred; `lib/pack-manifest.mjs` already validates the file): `"tests": { "hooks/realtime-guard.mjs": ["test/audio-packs.test.mjs"], "tools/prove-a-bank.mjs": ["test/prove-a-bank.test.mjs"] }`, with a doctor/structure check that
   every code file in the pack is a key (so the "no test names it" list above is empty by construction), and scripts/test-changed.mjs reading it. A `lib` entry would cover every hook that imports it through the existing `importers` graph.
3. A `requires` field per pack (`"requires": ["audio-core"]` in sound-design/pack.json) and the same graph: it makes the prove-a-bank to audio-core wav/spectrum edge visible to both the installer and test selection.
4. In a TypeScript tree, the import graph (`.mts` imports) replaces the basename heuristic for libs; hooks stay reachable only through their selftest, so keep `selftestsOf` and make it follow `import type`-free edges.
5. Fix the noise first: noop.test.mjs is chosen for every packs/ change (rule at `packs/` in TABLE). Adding a per-file digest to the lock fixtures makes it exact (it already lists each file).

Findings worth acting on regardless of the port: (1) sound-design depends on audio-core and says nothing; (2) stage-guard re-implements git-guard's `git add -A` law and secrets-guard's file list;
(3) heredoc and quote blanking is written eight times; (4) three tools use an `isMain` that is wrong for linked paths (source-ledger, route-table, names-sweep; KWB-158 fixed only the hooks); (5) buildq and prove-a-bank are tools importing hook libs by `../hooks/lib/`, an install-only path.
