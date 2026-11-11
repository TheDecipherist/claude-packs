# W3 layer 3, slice w3-l3-writes: report

Branch `work/2.0.0-ts-w3-l3-writes` (pushed). Files: `writes`, `turn`, `function-shapes`, in `packs/base/hooks/lib/`.

## Per file

| file | lines before | after | notes |
|---|---|---|---|
| writes | 72 | 102 | typed on `HookEvent` and `FileWrite`; payload parsed once, through `parseJson` |
| turn | 92 | 155 | transcript entry, block, `ToolUse`, `Turn`, `TurnWrite` typed beside it; transcript lines parsed through `parseJson` |
| function-shapes | 90 | 115 | `FunctionShape` typed beside it; `noUncheckedIndexedAccess` narrowing |

Copies removed: `turn` had its own `JSON.parse` of a line (now `parseJson`); `writes` had its own `JSON.parse` (now `parseJson`). `function-shapes` has no hash code, so there was nothing to move onto `hash.mts`.

## Signatures changed, importers updated

- `writesOf(payload, base, env)`: `base` and `env` are required (was `base = process.cwd()`, env read from `process`). Importers pass `process.cwd()` and `process.env` (or the `payload.cwd ?? ...` they passed already): audio-core `realtime-guard`, `param-id-lock`; stellix `no-shipped-images`; synth-creator `protect-vendor`, `frozen-files`, `chart-first`, `spec-lock`; base `placement-law`, `lesson-checks`, `file-size-guard`, `inside-the-project`, `brief-guard`, `shape-law`, `once-only`, `lib/unread-writes`; tests `kf-fail-open`.
- `writesOfTurn(turn, cwd, env)`: `cwd` and `env` required. Importers: `making-check`, `test/kf-refusals` (three calls).
- `judgeEvent(text, spec, run)`: new third parameter `run = { cwd(), env, stderr: { write } }`; every importer passes `process` itself (`process` has all three), so the module never names the global. Importers (14): zod `schemas-only`; audio-core `settings-layer`; full-stack `stack-guard`; postgres `db-wipe-guard`; reverse-engineering `firmware-out-of-git`; base `folder-law`, `secrets-guard`, `untrusted-boundary`, `dispatch-once`, `code-shape`, `template-law`, `repo-litter`, `suite-once`, `no-find`.
- `readPayload(text)` now returns null for valid JSON that is not an object (was: any parsed value).
- New exported types: `JudgeRun`, `JudgeSpec` (writes); `TranscriptEntry`, `ToolUse`, `Turn`, `TurnWrite` (turn); `FunctionShape` (function-shapes).

## Must be fixed by the lead (outside my files)

`.claude/hooks/kit-lock.mjs:67` calls `writesOf(payload, cwd)` with no env. After `update`, its selftest crashes (`env` undefined in `expand`). Fix: `writesOf(payload, cwd, process.env)`. I may not edit `.claude/`. The installed copy of every hook is refreshed by `update`, so this must go in before the installed `writes.mjs` does.

## Faults and notes

- Three importers (`placement-law`, `file-size-guard`, `realtime-guard`) carried the same 8-line frame that hand-parses the payload. `once-only` refused the importer edit (the frame became a copy of its siblings), rightly. I replaced the hand parse by `readPayload` in those three, which removes the copy. `lesson-checks` keeps its hand parse (only its call line changed), since the same refusal came up when it was changed to match.
- Refusals met: `template-law` (twice, then a third time) on the repeated long `judgeEvent` third argument across hooks; the fix was passing `process`. `once-only` (four times) as above. All were right; I could not mark them (`logs mark`) from this worktree session, the lead should mark them right.
- The `update --dir .` I ran in the worktree modified tracked files under `.claude/`; `git-guard` refused `git checkout` on them (right: uncommitted work). They are left uncommitted and are not part of any commit; discard the worktree's `.claude` changes at merge.

## For W4: hooks that still parse the payload by hand

`brief-guard`, `git-guard`, `lesson-checks`, `look-gate`, `making-check`, `run-hooks`, `shape-law` (base); `compile-cache` (cpp); `build-guard`, `time-guard`, `stage-guard`, `chart-first`, `protect-vendor`, `spec-lock`, `frozen-files` (synth-creator); `no-shipped-images` (stellix). (From `grep "JSON.parse(text)"`; `placement-law`, `file-size-guard`, `realtime-guard` moved to `readPayload` here.)

## Shape proposals

`TurnWrite { path, text: string | null, tool }` is the fourth write shape (`writesOf`'s `FileWrite { path, op, before, after }`, `ShellWrite`, `ProgramWrite`, `TurnWrite`). It should not simply become `FileWrite`: it carries only the text written (Edit's new string, not the whole file after) and no `before`/`op`; folding it needs `writesOfTurn` to compute full before/after, which changes `making-check`'s judging. Keep as is; proposed for `types.d.mts`: `JudgeRun` (a process view: `cwd()`, `env`, `stderr.write`) and `TurnWrite` / `ToolUse`.

## Proofs

- `npm run build` clean; `npm run check` exit 0.
- `test/repo-lint.test.mts`: 6 of 6 pass (gates 11 and 12 included).
- Selftests (base, each OK): agents-held 14, brief-guard 23, code-shape 19, dispatch-once 16, file-size-guard 9, folder-law 16, inside-the-project 16, lesson-checks 4 checks, look-gate 9, making-check 39, no-find 18, once-only 19, placement-law 9, repo-litter 10, secrets-guard 16, shape-law 58, suite-once 34, template-law 26, untrusted-boundary 8 (and git-guard, heartbeat, kit-fresh, making, reuse-hint, run-hooks, skill-first, all OK). Other packs' hooks only run installed; they are covered by the tests below.
- `test/routes.test.mjs` and `test/kit-guards.test.mjs`: 21 of 21 pass.
- `kit-lock --selftest`: FAILS after `update`, for the reason above (kit-lock's own call, to be fixed by the lead).
- `test:changed -- --base work/2.0.0-typescript`: see the end of this file.
- No unit test written for these three: `writes` and `turn` are covered by `routes`, `kf-refusals`, `kf-fail-open`; `function-shapes` by `code-shape`'s selftest.

## test:changed result (`--base work/2.0.0-typescript`, output in /tmp/l3w-changed.txt)

598 tests, 590 pass, 8 fail. Known reds on the base branch, not mine: the two house tests, no-personal-name, worktrees' kit-fresh case, KF-21, WB-4. Two are caused by this slice and need the lead (files I may not write):

1. `test/json-ratchet.test.mjs`: 486 raw JSON calls left, below the ratchet's 512 (this slice removed 26 raw `JSON.parse` calls: writes, turn and the hooks' hand parse). Lower `RAW_CALLS_LEFT` to 486 (after the other slices merge, the sum will differ).
2. `test/noop.test.mjs` full-stack case: an update now changes `.claude/hooks/lib/function-shapes.mjs` in the old full-stack install (it was rebuilt from the `.mts`); add it to that case's list (the writes and turn files showed no diff in this project's case).
