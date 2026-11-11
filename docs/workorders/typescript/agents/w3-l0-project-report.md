# W3 report: slice w3-l0-project (layer 0: project, layout, selftest, run-claudes, own-processes, crash-policy, compile-cache)

Branch `work/2.0.0-ts-w3-l0-project`, worktree `.claude/worktrees/w3-l0-project`.

## Per file (lines before -> after)

| file | before | after | what changed |
|---|---|---|---|
| project | 81 | 92 | No `ROOT`, no `process.*`. Every function takes the root and the base folder. `real` exported (single owner). |
| layout | 58 | 63 | `readLayout` reads through `readText` + `parseJson` (files.mts, json.mts); no memo exists, so none without an mtime key. Types from `types.d.mts`. |
| selftest | 52 | 61 | `runHook` returns `{ status, stdout, stderr }`; `put` still re-exported from files.mts; `scratchProject` uses `scratchDir`; json through `toJson`. |
| run-claudes | 88 | 109 | `sessionOrders` takes `platform` and `nowMs` (required), no `process.platform`/`Date.now()` defaults. `cwdsOf` takes `platform`. `projectOf` renamed `orderProjectOf` (see below). |
| own-processes | 52 | 58 | `sessionPid(rows, from)` and `ownProcesses(rows, from)`: `from` (the caller's parent pid) is required. |
| crash-policy | 47 | 56 | `crashVerdict(root, ev, judged, now)`: `now` passed in; json through `readJson`/`writeJson`/`toJson`, hash through `shortHash`, folder through `ensureDir`. |
| compile-cache | 66 | 67 | `readText` instead of `readFileSync`. `buildFolders` renamed `foldersBuiltBy` (see below). |

## Copies removed (called from the owner)
- crash-policy: own `createHash('sha1')...slice(0,16)` -> `shortHash` (hash.mts); `JSON.parse`/`JSON.stringify`/`writeFileSync` -> json.mts `readJson`/`toJson`/`writeJson`; `mkdirSync` -> `ensureDir`.
- selftest: own temp-dir maker (`realpathSync(mkdtempSync(...))`) -> `scratchDir`.
- layout, compile-cache: `readFileSync` -> `readText`.
- `real` (realpath or resolve): project.mts's stays the exported one. The base-hooks survey's other copies are in `hook-log` and `dup`; those layers should `import { real } from './project.mts'` and drop theirs.

## Signatures changed and their importers
- `project`: `insideProject(root, path, base)`, `commandLeavesProject(root, command, base, home)`, `checkoutRoot(root, file, base)`, `claudeRoot(root, file, base)`, `relInCheckout(root, file, base)`, `isWorktreeOfProject(root, dir)`; `commonGitDir(root)` unchanged; `ROOT` no longer exported. Export names kept. Importers (35 files, all in this commit): every base hook that imported it, the pack hooks (zod schemas-only, stellix no-shipped-images, audio-core param-id-lock/realtime-guard/settings-layer, reverse-engineering firmware-out-of-git, postgres db-wipe-guard, full-stack stack-guard, cpp compile-cache hook, synth-creator chart-first/frozen-files/spec-lock/protect-vendor), and libs `writes.mjs` (reads `CLAUDE_PROJECT_DIR ?? cwd` inside `judgeEvent`) and `unread-writes.mjs` (uses its own `root` parameter). Unconverted importers define `const ROOT = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd())` (or already had one) and pass `ROOT`, `process.cwd()`, `process.env.HOME` at each call; W4 replaces them with `ctx.projectDir` and `ctx.cwd`. `protect-vendor` no longer passes the project library around (`judge(root, ...)`, `verdict(payload, root)`) and its selftest no longer re-imports project.mjs with a changed env.
- `selftest.runHook` returns the spawn result. Importers reading the number now read `.status`: 24 hooks, plus `look-gate-selftest`, `making-check-selftest`, `skill-first-selftest`. For later layers: `hub-rig` and `kit-fresh-selftest` made their own runners because of this; they can use `runHook(...)` and its `stdout`/`stderr` now.
- `own-processes`: `time-guard.mjs` passes `process.ppid`. `crash-policy`: `run-hooks.mjs` passes `Date.now()`. `run-claudes`: `run-discovery.mjs` already passed `platform` and `nowMs`; `test/run-claudes.test.mjs` now passes `nowMs`.
- Renames made because template-law refuses a same-named function with another job: `projectOf` (run-status.mjs has one that strips a worktree path) -> `orderProjectOf`; `buildFolders` (lib/repo-weight.mjs has one that reads a file list) -> `foldersBuiltBy`. Only `test/run-claudes.test.mjs` imported the former; nothing imported the latter.

## Faults found (not fixed; today's behaviour kept)
1. crash-policy: `HOLD_MS` (one hour) only prunes the held list when a new hold is written. `readHeld` never checks age, so a crashed call stays "held" (goes through unjudged) until another crash writes the file, however long ago. Input: the same call crashing a hook twice 3 hours apart, no other crash between: the second one is not refused. The intent in the file's own comment says the hold expires.
2. `unread-writes.mjs` used the module's `ROOT` and now uses its `root` parameter; run-hooks passes `projectRoot()` which is the same value, so no change in practice.
3. `selftest.mts` `git(...)` returned `null`/a buffer; now `void` (no importer used the value).

## Types proposed for `types.d.mts`
`ProcessRow`, `AgentTree`, `SessionRun`, `SessionOrders`, `CwdsOf` (run-claudes.mts), `JudgedHook` and `CrashVerdict` (crash-policy.mts) and `HookRun` (selftest.mts) are defined and exported beside their modules. `JudgedHook` is what run-hooks' `judged` rows are; run-hooks (layer 4 or so) should use it. `HookRun` is what selftest-style runners (hub-rig, kit-fresh-selftest) should return.

## Proofs
- `npm run build` clean; `npm run check` exit 0.
- Unit tests (new, `test/unit/hooks-lib/`): project (3), layout (3), own-processes (2), crash-policy (3), compile-cache (3); all pass, with planted wrong inputs (a nested clone, a stale layout, a CXX build with no launcher, a crash with no `.claude` folder). `test/run-claudes.test.mjs` also in test:changed.
- Selftests, run in a scratch `.claude/hooks` laid out like an install (base + all packs): every hook's `--selftest` printed OK/PASS, including run-hooks, protect-vendor (both routes and repo), look-gate (9), making-check (39), skill-first (15), and the synth-creator hooks. The first test:changed run proved 39 of 40 (protect-vendor failed on a missing `.status`, fixed; the scratch run then passed it).
- `npm run test:changed` (base = the epic branch, 341 tests, load average 11 with the other two agents running): its first run was cut off at 628 s, leaving 31 files "pending"; those were re-run alone at concurrency 4 (285 tests: 280 pass, 5 fail, and the same 5 fail on the unchanged epic branch in the main checkout, run alone at concurrency 1: house "the house hooks install..." and "doctor fails when a hook fails its selftest", kf-refusals "KF-21", sub37-wb "WB-4", worktrees "every hook judges a worktree file"). Failures seen in the first run that are not this slice's (kit-guards looks the same on any fresh worktree; not checked on the trunk):
  - `test/json-ratchet.test.mjs`: "540 raw calls left, fewer than 547: lower RAW_CALLS_LEFT to 540". Caused by my json.mts use; the lead lowers the number (test file not in my allowed list; three slices will each move it).
  - `test/noop.test.mjs` (3 cases): the installed lists lack `files`, `git-run`, `hash`, `source-exts` (W2.5 additions), not mine.
  - `test/no-personal-name.test.mjs`: names in `docs/workorders/typescript/PROMPT.md`, `workorder.md` and `probes/proxy/*`, not mine.
  - `test/kit-guards.test.mjs`: seven "layout folder missing" problems (`proxy/`, `test/hooks/`, ...): a fresh worktree lacks them.
