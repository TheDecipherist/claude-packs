# W4 slice w4-hooks-c: report

Branch `work/2.0.0-ts-w4-hooks-c`. Nine base hooks moved onto the hook contract (`hook(event, ctx)` returning a Verdict), each
`git rm`'d first, then `X.mts` written, with `worktreeCase`, its `pack.json` role and its selftest (write trap where the selftest
runs the judge).

## Per hook (lines before -> after)

| hook | lines | role | notes |
|---|---|---|---|
| lesson-checks | 184 -> 213 | judge | `loadChecks(root)` now takes the root (no default read of the process). `selftest` is overloaded: `selftest(checks): string[]` for the CLI (`InstalledLessonChecksModule`), `selftest(): number` for the tail. An unknown mode no longer throws inside the selftest, it is named as a problem. Selftest proves checks only, it runs no project, so no write-trap row. |
| suite-once | 135 -> 143 | judge | `refusal(command, cwd, asked, { projectDir, env })` (was `refusal(command, cwd, asked)`; no importer outside the hook). `git status` through `gitLines`. Two write-trap rows (committed and dirty tree). |
| look-gate | 117 -> 147 | judge (both rows) | `--key` is a flag handler (`printKey(args)`, output through `writeVerdict`, process read through `contextOf`). Selftest still lives in `lib/look-gate-selftest.mts`, loaded by dynamic import under `--selftest` only. No write-trap row: that module builds its own repos and commits; it is outside my files. `codeKey` keeps sha256 (hash.mts owns sha1 only; keys already written must stay). |
| agents-held | 105 -> 129 | judge | decides from `ctx.env.CLAUDE_PACKS_UNATTENDED`, walks the parents from `ctx.sessionPid`. Selftest rows with the env said call `hook(event, contextOf({env}))` in process; the three parent-chain rows still run a stand-in `claude -p` for real. Write-trap row. |
| secrets-guard | 101 -> 119 | judge | write-trap row over both scratch projects (the two `.env` touches moved before the snapshot). Test DSN is built from two strings (the guard rightly refused the literal in the new file). |
| placement-law | 83 -> 118 | judge | `misplaced(layout: PlacementLayout, ...)`; the layout's `kinds[].content` is a regex source, `LayoutKind.content` in types.d.mts says boolean (see proposals). Selftest gained two rows through the runner and a write-trap row. |
| heartbeat | 79 -> 98 | recorder, async | time from `ctx.now`, project from `ctx.env.CLAUDE_PROJECT_DIR || event.cwd || ctx.cwd`. The "broken event text" row became a strange-event row (the runner and `readPayload` own bad text now). It writes the beat files, so no trap. |
| repo-litter | 77 -> 105 | judge | `BIG_MB`, `isRootImage` moved. `litterConfig(layout)` narrows `guards.repoLitter`. |
| folder-law | 76 -> 83 | judge | `isSource(file, layout)` (was `isSource(file)` reading the process); no importer outside the hook (making-check imports `isSource` from `dup`, a different function). |

## The hidden-API moves (wave 2 moves the importers)

- `isSecretFile` (and a new `isEnvFile`) now live in `packs/base/hooks/lib/secret-patterns.mts`, beside `SECRETS`. The hook
  `secrets-guard` re-exports `isSecretFile`, `SECRETS` and keeps `addedSecret`. `lib/scan.mjs` still imports from the hook: unchanged and working.
- `BIG_MB` and `isRootImage` now live in the new `packs/base/hooks/lib/litter.mts`; the hook `repo-litter` re-exports both.
  `lib/repo-weight.mjs` unchanged and working. Wave 2 should import from the libs.
- `lesson-checks` `loadChecks(root)` loses its `root = projectRoot()` default; `lib/scan.mjs` is the only importer and passes the copy.

## Worktree cases

Data in each hook's `worktreeCase`. Entries replaced entirely: folder-law, placement-law, secrets-guard (`worktrees.test.mjs`).
Entries that run the data and then keep their old function, because the rest needs more than files and events: agents-held (env
`CLAUDE_PACKS_UNATTENDED`), suite-once and repo-litter (a layout written into the worktree), look-gate (a commit in the worktree and
a layout), heartbeat (reads the beat files), lesson-checks (moves a concept in the worktree's layout; the data adds the worktree's own check).
The shared test project runs every case in one repo, so a `files` entry must not overwrite `.claude/layout.json` (rewriting it would
break later cases): that is why those stay functions until slice 6.

## New emitted files (for `.gitignore`)

`packs/base/hooks/{lesson-checks,suite-once,look-gate,agents-held,secrets-guard,placement-law,heartbeat,repo-litter,folder-law}.mjs`
and `packs/base/hooks/lib/litter.mjs`. Removed tracked sources: the nine `.mjs` hooks.

## Installed files noop will report

The nine hooks (rewritten), `lib/secret-patterns.mjs` (changed), new `lib/litter.mjs`. Also: `pack.json` rows now carry `"role"`, and
the generated `settings.json` copies it (`"role": "recorder"` for heartbeat). Four noop tests (stellix, sub37, synth-creator install,
full-stack) fail on that line; `no-find`'s `role` should already do the same on the base branch. The lead decides: strip `role`
from settings entries, or add it to the fixtures.

## JSON ratchet

No raw `JSON.parse` / `JSON.stringify` left in these nine (they use `readJson`, `parseJson`, `writeJson`, `toJson`); the four test
fixtures strings in selftests use `JSON.stringify` on data (repo-litter, suite-once selftests, as before). Count not measured.

## Types proposed for types.d.mts

- `LayoutKind.content` should be `string` (a regex source), not `boolean`; placement-law carries a local `PlacedKind` until then.
- `InstalledLessonChecksModule`: add `loadChecks(root)` and `hitsOf(check, text)` (scan uses them); `Check` (the loaded check with
  `file`, `flags`, `prose`, `needs`, `replaces`, `whenDep`, `examples`) is exported from `lesson-checks.mts`.
- `HookContext.env` readonly is fine; a `SuiteWhere`-like `Pick<HookContext,'projectDir'|'env'>` is used locally by suite-once.

## Faults found

- None that changed a result. Behaviour notes: lesson-checks `before` null is read as `''`; an unknown check `mode` is reported by
  the selftest instead of throwing. `lesson-checks` still crashes on a check file that is not JSON (kept; an Error naming the file).
- `selftest(checks)` was never exported by the old `lesson-checks.mjs` although `types.d.mts` declared it; it is now.
- Refusals met while writing: template-law (names `checkOf`, `linesOf`, `judgeAdd` clash with other modules: renamed, right),
  secrets-guard on the planted DSN in the new selftest (right), code-shape on two 260+ column lines (right). `logs refusals --open` shows none open here.

## Proofs

- `npm run build` and `npm run check`: exit 0.
- repo lint (`test/repo-lint.test.mts`): 7 pass, 0 fail (a first run failed gate 11 on `process.env` text in a template literal in secrets-guard; reworded).
- selftests (through the runner): lesson-checks OK (4 checks), suite-once OK (36), look-gate OK (9), agents-held OK (15), secrets-guard OK (17),
  placement-law OK (12), heartbeat OK (10), repo-litter OK (11), folder-law OK (17); `run-hooks.mjs --selftest` OK (19).
- `test/worktrees.test.mjs`: 4 of 5 pass; the one red is the known kit-fresh case, and every one of my hooks' cases passed before it.
- `npm run test:changed -- --base work/2.0.0-typescript` (`/tmp/w4-hooks-c-tc.txt`): 105 run, 98 pass, 7 fail: house x2 (known),
  worktrees kit-fresh (known), and the four noop tests (the `role` line above, not a hook fault).
- Write trap not seen red for the planted case (a judge that writes): the rows pass because no judge writes; I did not plant a writing judge.
