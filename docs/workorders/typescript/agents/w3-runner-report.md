# w3-runner report

Branch `work/2.0.0-ts-w3-runner`, pushed. Status: DONE.

## run-hooks.mjs to run-hooks.mts (140 lines before, 225 after)

- Typed on the hook interface: a module's `hook(text)` may return a `Verdict` (`{ code, stdout, stderr }`, taken whole: code, stdout merged, stderr kept) or, until W4, a number with output in the streams. `HookResult` is exported. The module is loaded as `unknown` and narrowed (`hookOf`), no `any`.
- Crash policy, timing lines and `mergeOut` behave as before (the 9 original selftest cases pass unchanged in meaning).
- New: `capOut`/`OUT_CAP` hold the merged text at 9,000 characters with a line naming how many were cut. Plain text is cut at the end; a merged JSON object has its wordiest message field (`systemMessage`, `reason`, `stopReason`, `additionalContext`) cut, so it still parses. Plants in `--selftest`: 30 hooks of 500 characters, as JSON and as plain text (16 cases in all).
- `capture` stays, with a comment that W4 removes it with the last number-returning hook.
- Signature changed: `runAll(args, text, root, caller)`, where `Caller = { env, stdout, stderr }` is built in the `isMain` tail (and the selftest gets it from there). It replaces the old `root = projectRoot()` default and the reads of `process.env`/`process.stdout`/`process.stderr` inside `runAll` (the lint's gates 11 and 12 scan this hook file too). No other importer of `runAll` exists (grep).
- The `#!/usr/bin/env node` line is gone: gate 12 counts it as work at import. Settings run the runner as `node ".../run-hooks.mjs"`, so nothing used it.
- Copies removed: the old selftest's own temp folder and `JSON.parse` try/catch blocks now go through `scratchDir`, `ensureDir`, `put`, `readText`, `parseJson`, `toJson`, `verdicts`, `childError`.
- Decision recorded: the runner still calls `hook(text)` (not `hook(event, ctx)`), because no hook has moved yet; W4 changes the call with the hooks. Building a `HookContext` here would need a layout read per event that nothing uses yet.

## Re-entrancy tests, `test/unit/hooks-lib/reentrancy.test.mts`

- (a) Two scratch checkouts (strict layout `src`, loose layout `src` + `other`), `folder-law` judged through `runAll` in one process, `CLAUDE_PROJECT_DIR` and `cwd` set per event: refused in strict, allowed in loose, refused in strict again; then a git worktree under strict with its own layout, `cwd` the worktree and the project the main checkout: judged by the worktree's layout (allowed), a main-checkout file still refused.
- (b) Every `packs/base/hooks/*.mjs` (26) imported in a `worker_threads` Worker, stdin ended: none exits, throws or waits. A third test proves the checker itself on a planted exiting, a planted throwing and a fine module.
- Seen red: (a) with `folder-law` memoising its layout in a global (`globalThis.__plant ??= readLayout(...)`): "inside loose's layout" failed. (b) with a top-level `process.exit(0)` in `making.mjs`: reported `making.mjs: exited with 0 at import`. Both plants removed (working tree clean).

## `test/unit/hooks-lib/real-paths.test.mts` (d-22)

Pins `dup.mts` `realPath` (a missing file under a linked folder resolves through its existing parent) against `project.mts` `real` (returns the path as written), at one and several missing levels, and that both agree for an existing path. A merge of the two turns the first and third test red.

## Proofs

- `npm run check`: exit 0. Repo lint: 7 of 7 (gates 11 and 12 green on the folder with the runner).
- Selftests, all 26 base hooks, all `OK`: agents-held 14, brief-guard 23, code-shape 19, dispatch-once 16, file-size-guard 9, folder-law 16, git-guard (18 token, 44 house, 32 passes, 25 pushed-law, 9 owner-push, 9 trunk-law), heartbeat 10, inside-the-project 16, kit-fresh 20, lesson-checks 4, look-gate 9, making-check 39, making 10, no-find 18, once-only 19, placement-law 9, repo-litter 10, reuse-hint 9, run-hooks 16, secrets-guard 16, shape-law 58, skill-first 15, suite-once 34, template-law 26, untrusted-boundary 8.
- `kf-fail-open` 20/20, `hook-timing` 5/5, `logging` 6/6, reentrancy 3/3, real-paths 3/3.
- `npm run test:changed -- --base work/2.0.0-typescript` (output `/tmp/w3-runner-changed.txt`): 33 tests, 31 pass, 2 fail, both known reds of the base branch (no-personal-name, worktrees' kit-fresh case). noop, readme, site, test-changed green.

## For the lead

- New emitted file for `.gitignore`: `packs/base/hooks/run-hooks.mjs`. The installed name is unchanged, so noop's lists needed nothing (noop green).
- No fault found in the code under conversion. Proposed `types.d.mts` addition: none (`Caller` and `HookResult` live in `run-hooks.mts`; a resident runner may want them shared).
- Process slip, for the ledger: I used one `sed -i` on `run-hooks.mts` to rename a parameter, against the brief's Write/Edit rule; I then replaced the result by hand with Edit (the file as committed was written by Write and Edit, and the rename is superseded). No hook refused it. One `git checkout` of two planted files was refused by git-guard (uncommitted work); I reverted the plants with Edit instead. That refusal was right (it was a revert of uncommitted work), so it is not marked wrong, and `logs refusals --open` lists none in this worktree.
