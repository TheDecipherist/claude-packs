# Findings: W1, before building

Each finding with its number and its evidence under `build/evidence/W1/`. Measured on this Mac (darwin arm64, node v26.12.1,
TypeScript 7.0.2 native), 2026-11-11.

## W1.2 The whole tree under TypeScript 7, and the merged-install imports {#w1-2}

- `tsc --noEmit -p build/evidence/W1/tsconfig.probe.json`: `allowJs`, `checkJs`, the order's strict set (strict, noUncheckedIndexedAccess,
  noImplicitOverride, noFallthroughCasesInSwitch, verbatimModuleSyntax, isolatedModules, erasableSyntaxOnly, useUnknownInCatchVariables),
  module/moduleResolution nodenext, target es2023, types node, skipLibCheck, over every `.mjs` of bin, lib, global, scripts and packs:
  **187 files** (the same 187 git lists), **3,742 errors**, **0.28 s cold, 0.21 s warm** (load 4.90). 87 are TS2307, every one a pack
  file importing base's libs as the merged install lays them out (`./lib/glob.mjs` from `packs/audio-core/hooks/`).
- The mapping: `rootDirs` listing every `packs/*` folder (`tsconfig.rootdirs.json`). TypeScript then treats the packs as one merged
  root, so a hook's `./lib/x.mjs` and a tool's `../hooks/lib/x.mjs` both resolve onto base's: **0 TS2307** on the whole tree, 3,659
  errors, 0.22 s; `packs/zod/hooks/schemas-only.mjs` and `packs/sound-design/tools/prove-a-bank.mjs` resolve every import (54
  errors between them, none an unresolved import: all are the untyped-parameter kind the conversion removes). Not taken: `paths`
  (one entry per lib file, and it does not cover `../hooks/lib/`).
- Errors under the chosen config, per folder and per code (`tsc-tables.md`): packs/base/hooks (with its lib) 1,706, the other packs
  795, lib 772, packs/base/tools 145, scripts 124, global 71, bin 46; TS7006 (untyped parameter) 2,739, TS7031 157, TS2339 140,
  TS2345 98, TS7005 72, TS7053 72, TS18048 61, TS2532 57, TS2322 56, TS7034 48; about 3,070 are untyped parameters and bindings
  (7006, 7031, 7005, 7034, 7019, 7022 to 7024), about 590 are shape and null errors to read as the files are converted.

## W1.1 The language server, through Claude Code's `LSP` tool {#w1-1}

- The declaration: a local marketplace `.claude-plugin/marketplace.json` (`claude-packs-kit`) whose one plugin,
  `.claude-plugin/typescript-lsp/` (`kit-typescript-lsp`), declares `lspServers.typescript`: `command`
  `${CLAUDE_PROJECT_DIR}/node_modules/.bin/tsc`, `args` `["--lsp", "--stdio"]`, `.ts .mts .cts .tsx`. `claude plugin validate` passes
  both. A small subfolder is the plugin's source, so an install never copies the repo into the plugin cache.
- Enabled for the probe with `claude plugin marketplace add <checkout> --scope local`, `claude plugin install
  kit-typescript-lsp@claude-packs-kit --scope local` and `claude plugin disable typescript-lsp@claude-plugins-official --scope local`.
  Local scope wrote the main checkout's `.claude/settings.local.json` (ignored), even when run from a worktree: Claude Code keys a
  project by its main checkout.
- The leaf: `packs/base/hooks/lib/glob.mjs` converted to `glob.mts` in a scratch worktree (`.claude/worktrees/w1-lsp`) with a tsconfig
  of `allowJs`, the strict flags and W1.2's `rootDirs`; its importers left as `.mjs` (their `./glob.mjs` resolves to the `.mts`).
- A child session started after the settings change (`claude -p --model sonnet`, stream-json in `lsp-tsc-child.jsonl`): its init
  lists the `LSP` tool and the plugin `kit-typescript-lsp`. On `matchesAny` (`glob.mts` 31:17), the raw replies (`lsp-tsc-replies.txt`):
  - `goToDefinition`: **"Defined in packs/base/hooks/lib/glob.mts:31:17"**
  - `findReferences`: **"Found 75 references across 28 files"**, the `.mjs` importers in lib, base and the other packs among them
    (`packs/audio-core/hooks/param-id-lock.mjs` 17:10 and 53:58, through `rootDirs`)
  - `incomingCalls`: **"Found 33 incoming calls"**, each with its function (`lib/repeats.mjs` `repeatedShapes`, `packs/base/hooks/code-shape.mjs` `judgeWrite`, ...)
- So `tsc --lsp --stdio` from TypeScript 7.0.2 serves definitions, references and call hierarchy on `.mts` through the tool, and
  `typescript-language-server` with TypeScript 6 was not needed; it was not tried (d-3 completed: one dependency).

## W1.3 The emit, end to end, on two files {#w1-3}

- In a scratch worktree (`.claude/worktrees/w1-emit`): `readText` moved out of `shell-writes.mjs` into a new leaf `files.mts` (the
  owner W2.5 names; `shell-writes` re-exports it), so `json` depends on nothing but `files`; `json.mjs` and `project.mjs` taken out,
  then written as `json.mts` and `project.mts` (strict types, `unknown` and narrowing, no `any`); `repo-index.mjs`'s different
  `readText(text, rel)` renamed `shapesOfText` (template-law refused the second name, rightly). The installer's `JUNK` gains `.mts`
  (so `.d.mts` too), `.map`, `.tsbuildinfo`; `files` gains `!**/*.mts`, `!**/*.tsbuildinfo`, `!**/*.map`.
- The build: `tsc -p tsconfig.json` with the strict set and `rewriteRelativeImportExtensions`, no `outDir`: 0 errors, **0.22 s**
  warm; `json.mts`'s `import './files.mts'` is emitted as `'./files.mjs'`, beside its source; the unconverted importers
  (`no-find`, `template-law`, `inside-the-project`, `secrets-guard`) pass their selftests on the emitted files.
- The package: `npm pack`: 1,022 files, **0 `.mts`**, the emitted `json.mjs` in it. Installed into a fresh project's `node_modules`
  (`npm install <tarball>`), `init --config base` from it: **0 `.mts` in `.claude/`**, `doctor --strict` **OK: base**.
- The lock: for `json.mjs`, `files.mjs` and `project.mjs`, the lock's hash, the installed file's `sha256` and the emitted file's
  `sha256` are the same (json `4ab00bd2...`, files `eb9131ae...`, project `61a1c4bd...`; `emit-hashes.txt`).
- Found on the way: KWB-170 (template-law reads the emitted `.mjs` beside its `.mts` as a copy, so every edit of a converted file
  after a build is refused; marked wrong; W2.8 fixes the readers), KWB-171 (version-pin-guard reads `$T/x.tgz` as a package;
  met by writing the path out). `parseJson<T>` returns `JSON.parse(text) as T`: the one cast left, the boundary where outside text
  becomes a named shape; W2.4 decides whether a validator replaces it.

## W1.4 The fixture copy {#w1-4}

- `init --config base` into `/tmp/w1-copy-a`, copied whole (`cp -R`) to `/tmp/w1-copy-b`: **0 files** in the copy name the source
  folder (a grep over the tree); `doctor --strict --dir` the copy: **OK: base**.
- Three events fired in the copy through its own settings entries, as Claude Code runs them (`build/evidence/W1/fire.mjs`, every
  entry whose matcher fits, `CLAUDE_PROJECT_DIR` the copy; `fixture-fire-b.txt`): `git push --force` refused by git-guard (exit 2),
  a Write of a GitHub token refused by secrets-guard (exit 2), a prompt passed (exit 0). Each judged by the copy.
- After those events the copy was copied again (`/tmp/w1-copy-c`): `doctor --strict` OK, the same two refusals (`fixture-fire-c.txt`).
- Every absolute path, path by path:
  - `.claude/settings.json`: none. Every command is `node "$CLAUDE_PROJECT_DIR/.claude/hooks/..."` and a relative hook list.
  - `.claude/claude-packs.lock.json`: none (relative keys, hashes, the kit's version).
  - `.claude/layout.json`, rules' `paths:`, `CLAUDE.md`: none (project-relative).
  - `.claude/state/duplicates.json`: none.
  - `.claude/logs/events.jsonl` and `refusals.jsonl`: each event's `cwd`, so the source folder's events stay in the copy
    (`/tmp/w1-copy-b` 5 times in copy c beside its own 5). Nothing breaks on them, but doctor reads crashes from the logs: a crash
    logged in the source would make every copy red.
  - outside the project, in the temp folder: the repetition indexes (`claude-packs-repo-<sha256(root)>.json`,
    `claude-packs-dup-index/<sha1(realpath)>.json`) and the selftest cache (keyed by content hash): keyed by path or content,
    so a copy builds its own and never reads the source's.
- The rewrite the copier needs: **none in the install's files**. It copies a fresh install (or leaves out `.claude/logs/`,
  `.claude/hooks.log` and `.claude/state/` from a used one) and runs each test with `CLAUDE_PROJECT_DIR` set to the copy. W5.4's
  plant (a copy with a stale absolute path fails) plants such a path, since a clean install has none.

## W1.6 The readers blind to `.mts` {#w1-6}

- The probe (`build/evidence/W1/readers.mjs`, `readers-before.txt`): in a scratch project with `src/a.mjs` holding a 44-line function
  and `maxFileLines` 300, the same Write as `.mjs`, `.mts` and `.cts`: a 400-line file through `file-size-guard`, and a copy of the
  function under another name through `once-only`.
  - `.mjs` (the control): file-size-guard **exit 2**, once-only **exit 2**: both judged.
  - `.mts`: file-size-guard **exit 0**, once-only **exit 0**: neither judged.
  - `.cts`: file-size-guard **exit 0**, once-only **exit 0**: neither judged.
- The causes, as the repeats survey found: `file-size-guard.mjs` `SOURCE`, `dup.mjs` `SOURCE` (once-only's), `elements.mjs` `CODE` and
  `MARKUP`, `shape-code.mjs` `CODE` each list `.ts` but not `.mts` or `.cts`. W2.5's `source-exts.mts` is the one table they read;
  W2.8 runs this probe again and wants exit 2 on all six.

## W1.5 The daemon, nine probes {#w1-5}

The prototype (`probes/proxy/daemon.mjs`, `client.go`) captured output by reassigning stderr and failed open, so d-10's
mechanisms were probed on a fuller pair written for this step: `probes/proxy/resident-probe.mjs` (framed requests, a worker pool
with one hook per worker at a time, refusals in table order after a 30 ms grace, the index on the main thread) with
`resident-probe-worker.mjs`, and `probes/proxy/client-probe/main.go` (the socket named by sha256 of uid, project realpath, the
lock's hash and node's path, in a mode-700 folder, `/tmp/claude-packs-UID/` past 100 bytes; any failure runs the TypeScript runner
on the same stdin and starts one daemon under an exclusive start lock). The driver is `probes/proxy/probe-w1-5.mjs`; its output
is `build/evidence/W1/daemon-probes.md` (load 3.14) and `daemon-probe5.md`. A base install's six Bash hooks are the table.

1. **Eight clients racing, no daemon:** all eight exit 2 (each judged by the TypeScript path), **one daemon** started; their walls
   629 to 726 ms (the TypeScript runner plus the starter waiting up to its `ready` line); the next event **exit 2 in 11 ms** by the socket.
2. **A hook holding a worker 1.7 s while six events ask:** pool 4: the slow event 1,714 ms, the six others **18 to 34 ms**; pool 1: the
   six others **1,664 to 1,668 ms** (each waits for the slow one). So no head-of-line wait while the pool has a free worker; W8.2's
   `min(16, cores)` pool is what keeps it so.
3. **JSON on stdout:** 99 bytes (with `é` and `✓`) through a framed reply, **byte for byte equal** to what the hook printed.
4. **The lock changed during an event:** the event in flight finished on the old daemon (exit 0); the next event's socket name
   differed, so it took the TypeScript path (exit 2) and started a new daemon; the one after was answered by the new socket (exit 2).
   Two daemons were running: the old one idles until W8.2's 15-minute idle exit.
5. **The daemon killed mid-event** (SIGKILL at 300 ms of a 1.7 s event): the client read "reply cut before its length: EOF" and
   returned **exit 2 in 466 ms** from the TypeScript path (git-guard refusing the force push). Never exit 0. (A first run of this
   probe was answered before the kill: git-guard refused at once and the 30 ms grace returned without waiting for the slow hook.)
6. **A stale socket file** (the daemon SIGKILLed, its socket left): connect refused, the socket unlinked after the failed connect,
   **exit 2 in 166 ms** by the TypeScript path, then **exit 2 in 18 ms** by a new daemon's socket.
7. **A socket path over 100 bytes:** in the cache folder it would be 153 bytes (macOS takes at most 104); the client used
   `/tmp/claude-packs-502/<key>.sock` (43 bytes); **exit 2 in 15 ms** by that socket.
8. **A repetition-index query from a worker to the main thread** by message, on bandwarp's index (196 files, 4,224 statement
   shapes, loaded once in the main thread): 200 lines asked, the round trip **0.06 to 0.10 ms** (five runs).
9. **An unattended client starts the daemon, then an interactive one asks:** the daemon judged each by its own event's env:
   the unattended event **exit 2** ("CLAUDE_PACKS_UNATTENDED=1"), the interactive one **exit 0** ("CLAUDE_PACKS_UNATTENDED=");
   one daemon. (Today's hooks read `process.env` at import, so the probe sets each event's env around the hook in its worker; W3's
   `ctx.env` does it without touching the process.)

Learned for W8.2: (a) the starter should not hold its event for the daemon's `ready` line: the first event waited about 500 ms
for it; the start lock can be released by the daemon itself once it listens; (b) a judge that refuses at once ends the event
after 30 ms, so a slow judge's result for that event is `late` (W8.2's log line); (c) `project.mjs` `ROOT` frozen at import
makes the daemon's hooks judge the first project only: the probe passed `CLAUDE_PROJECT_DIR` in the daemon's env, which W3's
`ctx.projectDir` replaces.
