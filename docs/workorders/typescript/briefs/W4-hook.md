# Brief: W4, move one hook onto the contract

Every slice of W4 moves its hooks one at a time with this recipe. The worked example is `packs/base/hooks/no-find.mts` (and its
tests); read it first. Read also the order's W4 (`docs/workorders/typescript/workorder.md`, "## W4"), d-10 and d-23 in
`decisions.md`, and the W3 brief (`briefs/W3-layer.md`) for set-up, the Write and Edit tools only, marking refusals and the report.
Both kinds of hook work while W4 runs: the runner and `runAsHook` call a hook declared with two parameters as the contract, and any
other as the old `hook(text) => number`. A hook is on the contract when `hook.length === 2`.

## The steps, for each hook `X`

1. `git rm packs/<pack>/hooks/X.mjs` as its own command. Write `X.mts` beside it with the Write tool (never a heredoc, `sed -i`
   or a python rewrite). Imports name `.mts`; the installed name stays `X.mjs` (pack.json and settings keep it; the build emits it).
2. The imports:
   ```ts
   import { isMain, runAsHook } from './lib/hook-log.mts';
   import { pass, refuse, say } from './lib/verdict.mts';
   import type { Hook } from './lib/types.d.mts';
   import { judgeVerdict } from './lib/writes.mts';           // the guard frame, when the hook judges commands and writes
   import { verdicts, scratchProject, runHook } from './lib/selftest.mts';
   import type { WorktreeCase } from './lib/selftest.mts';
   ```
3. The signature, declared with BOTH parameters even if one is unused (name it with a leading underscore), because `length` is how
   the runner tells the kinds apart:
   ```ts
   export const hook: Hook = (event, ctx) => { ... return pass; };
   ```
   Return the answer; never print it or exit. `pass` says nothing (exit 0); `refuse(reason)` is exit 2 with the reason on stderr
   (a newline is added if missing); `say(output)` is exit 0 with output for Claude Code (JSON text, a value serialised as JSON,
   or plain context). A hook that judges commands and writes uses `judgeVerdict(event, { name, command, write }, ctx)`, the
   frame `judgeEvent` has, returning the Verdict. A hook may be `async`: `Hook` allows `Promise<Verdict>`. A hook that returns
   nothing, or throws, is a crash (the runner's crash policy), so every path returns a Verdict.
4. Read the event from `event` (already parsed; never `readPayload(text)` again) and the world from `ctx`, never from the
   process: `ctx.projectDir` for `projectRoot()`, `ctx.cwd` for `process.cwd()`, `ctx.env` for `process.env`, `ctx.sessionPid` for
   `process.ppid`, `ctx.layout` for `readLayout(projectDir)`, `ctx.now` for `Date.now()`, `ctx.log(line)` for a debug line. The
   repo lint (gates 11 and 12) refuses `process.env`, `process.cwd()`, `process.ppid`, `process.exit`, `process.stdout`,
   `process.stderr` and `console.*` outside the `isMain` tail, and any call that does work at import. A helper that needs one
   of them takes it as a parameter.
5. The tail (the `if` is for the gate that reads the top level; `runAsHook` checks `isMain` again, harmlessly):
   ```ts
   if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'X', hook, selftest, { flags: { '--check': (args) => check(args) } });
   ```
   `flags` holds the by-hand flags the old tail handled itself (`--check`, `--key`, `--init`): handler name with the dashes,
   given the arguments after the program's own two, returning an exit code. Order: `--selftest`, then a declared flag, else the hook
   on stdin. `selftest` is exported: `export function selftest(): number`.
6. `export const worktreeCase: WorktreeCase = { files?, steps: [{ label, event, want }] }`: what `test/worktree-cases-*.mjs` held
   for this hook, as data. `event` is the payload as Claude Code sends it; `{here}` and `{wt}` in strings (in `files` too) become
   the main checkout and the agent worktree. Delete the hook's entry from `worktree-cases-commands.mjs` / `-packs.mjs` and put
   `'X.mjs': caseFrom('X.mjs', (await import('../packs/<pack>/hooks/X.mjs')).worktreeCase)` in its place (`caseFrom` is in
   `test/worktree-rig.mjs`). A case that needs more than files and events (a lock, a git remote) stays a function in the cases
   file until slice 6 rebuilds them; say so in your report.
7. pack.json: the hook's row gets `"role": "judge"` (refuses, writes nothing, so it can run in parallel) or `"role": "recorder"`
   (writes, never refuses; run in turn), and `"async": true` where it already is. A hook that both refuses and records is split
   (once-only: its judge and its index update).
8. A judge's selftest runs under the write trap: take `const before = snapshot(dir)` after the scratch project is set up, and end
   the rows with `['a judge writes no file (the write trap)', writtenSince(dir, before).join(','), '']`. The runner's own logs
   (`.claude/hooks.log`, `.claude/logs/`) do not count. A recorder says what it writes in its own row instead.
9. Prove it: `npm run build`; `npm run check` exit 0; `node packs/<pack>/hooks/X.mjs --selftest`;
   `node packs/base/hooks/run-hooks.mjs --selftest`; `test/worktrees.test.mjs`; a unit test under `test/unit/hooks/` if the hook
   has logic of its own; `npm run test:changed -- --base work/2.0.0-typescript` (output to a file).
10. Commit by name: `git add <sources, tests, pack.json>`, `git diff --cached --name-status` shows the `X.mjs` removal and only
    what you mean, then `git commit -m "typescript W4 <slice>: X on the contract"` plainly for the staged removal (never name an
    emitted `.mjs` in `-- <paths>`: git ignores it, and naming it commits the build output; the lint's gate 3b refuses it,
    KWB-179). Push the branch after each commit.

## What the example shows

`no-find.mts`: `hook` is `(event, ctx) => judgeVerdict(event, spec, ctx)`; its selftest and its 18 rows are unchanged, plus the
write-trap row; `worktreeCase` is three steps of data; the tail is the line in step 5. The old `hook = main` and `process`
argument to `judgeEvent` are gone.
