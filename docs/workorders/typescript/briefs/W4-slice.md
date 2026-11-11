# Brief: W4, convert one slice to strict TypeScript

You convert one slice of the kit to strict TypeScript, unattended: take the recommended choice and record it in your report.
Your prompt names your slice, branch, worktree and files. Read first: `CLAUDE.md`; the order's W4 in
`docs/workorders/typescript/workorder.md` (search "## W4"); `docs/workorders/typescript/decisions.md`; the converted base library
`packs/base/hooks/lib/*.mts` (the owners: `files`, `git-run`, `hash`, `json`, `source-exts`, `glob` with `escapeRegExp`, `project`
with `real`, `verdict`, `hook-log` with `runAsHook` and `contextOf`, `writes` with `writesOf`, `readPayload`, `judgeVerdict`,
`selftest` with `runHook`, `verdicts` and the write trap) and `types.d.mts`.

## The rules, from W3 (`docs/workorders/typescript/briefs/W3-layer.md`)

Everything in that brief holds: the set-up (`git worktree add .claude/worktrees/<slice> -b work/2.0.0-ts-<slice>
work/2.0.0-typescript`, then `npm ci --no-audit --no-fund && npm run build` in it), each file `git rm`'d as its own step before
its `.mts` is written, strict types with no `any` and no silencer, owners called and copies taken out, no process global and
no work at import in a hook or hook-lib module (gates 11 and 12), importers updated with a signature, the Write and Edit tools
only (never a shell heredoc, `sed -i` or a python rewrite of a source or a test), a staged `git rm` committed with a plain
`git commit -m` after `git diff --cached --name-status` (never an emitted `.mjs` named in `-- <paths>`: gate 3b), each refusal
read and marked, a fault reported rather than fixed silently, and the report with one status line.

## A hook

Move it exactly as `docs/workorders/typescript/briefs/W4-hook.md` says, with `packs/base/hooks/no-find.mts` as the worked
example: `export const hook: Hook = (event, ctx) => ...` declared with both parameters, returning `pass`, `refuse(reason)` or
`say(output)`; `ctx.projectDir`, `ctx.cwd`, `ctx.env`, `ctx.sessionPid`, `ctx.layout`, `ctx.now` instead of `projectRoot()`,
`process.cwd()`, `process.env`, `process.ppid`, a layout read, `Date.now()`; its tail `await runAsHook(import.meta.url, '<name>',
hook, selftest, { flags })` with its by-hand flags as handlers; `export const worktreeCase` beside `selftest` (and its entry in
the worktree cases reading it, as no-find's does); its `pack.json` hook row gains `"role": "judge"` or `"role": "recorder"` (a
judge refuses and writes nothing; a recorder writes and refuses nothing; a hook that does both is split in two) and `"async":
true` where it is async; a judge's selftest runs under the write trap. A hook still `hook(text)` keeps working (the runner runs
both kinds), so a slice never waits for another.

## A CLI module, a tool, a script, a test helper

The same rules as a library module: typed on `types.d.mts`, its raw JSON reads onto `json.mts`, its git onto `git-run.mts`,
its walks onto `files.mts` `walk`, its layout reads onto `layout.mts` `readLayout`, a failed child's message through `childError`,
`process.argv[1] === ...` compares onto `isMain`. A module of `lib/` may read the process (gates 11 and 12 hold hook and hook-lib
modules only), but a value it reads from the process inside a function that a test or another module calls should be a
parameter. Importers of the CLI's modules: `bin/claude-packs.mjs`, other `lib/` modules, `scripts/`, `test/`: keep every export
name they use, or update them in the same commit.

## Proofs

`npm run build`, `npm run check` exit 0, the repo lint (`node --import ./test/fresh-tmp.mts --test test/repo-lint.test.mts`, 7
tests), the selftest of every hook you changed (`node packs/<pack>/hooks/<hook>.mjs --selftest`; a non-base pack's hook in a scratch
install: `init --config <one that brings the pack>` then `CLAUDE_PACKS_SELFTESTS=run node bin/claude-packs.mjs doctor --fresh
--dir <scratch>`), `test/worktrees.test.mjs` for any hook, your unit tests (`test/unit/lib/NAME.test.mts` for a `lib/` module with
logic, `test/unit/hooks-lib/` for a hook lib), and `npm run test:changed -- --base work/2.0.0-typescript > /tmp/<slice>-tc.txt
2>&1` (read it before running anything again; known reds on the base branch, not yours: house's two, no-personal-name,
worktrees' kit-fresh case, kf-refusals KF-21, sub37-wb WB-4). In your report name: every new emitted file (for the lead's
`.gitignore` and noop's lists), every changed installed file noop reports, the JSON ratchet's new count, the types you propose,
the faults you found.
