# Brief: W3, convert one slice of a layer of `packs/base/hooks/lib` to strict TypeScript

You are one of three agents converting one import layer of the base hooks library. Your prompt names your slice, your branch
and your files. Everything here holds for every slice. Read, before you start: `CLAUDE.md` (the kit), the order's W3 in
`docs/workorders/typescript/workorder.md` (search "## W3"), `docs/workorders/typescript/decisions.md` (d-2, d-4, d-10, d-17 to
d-20), and the owners you build on: `packs/base/hooks/lib/{files,git-run,hash,json,source-exts}.mts` and `types.d.mts`.

## Set up

1. From the main checkout: `git worktree add .claude/worktrees/<slice> -b work/2.0.0-ts-<slice> work/2.0.0-typescript`, then
   work only in that worktree (`cd` into it for every command). Then `npm ci --no-audit --no-fund && npm run build`.
2. Keep `docs/workorders/typescript/agents/<slice>.json` in your worktree, written after each file:
   `{ "name", "step": "W3", "items": <your file count + 1>, "done", "now": "<one line>", "updated": "<ISO time>" }`.

## For each file `X` of your slice, in this order

1. `git rm packs/base/hooks/lib/X.mjs` as its own command (the template law refuses a new file while its old copy stands).
2. Write `packs/base/hooks/lib/X.mts` with the Write tool: the same behaviour, strictly typed (the tsconfig's strict set:
   `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `erasableSyntaxOnly`). Explicit parameter and return types on every export.
   `unknown` and a narrowing where a value's shape is not known; never `any`, `as any`, `@ts-ignore`, `@ts-expect-error`,
   `@ts-nocheck`, or a non-null `!` where a check can stand; no `enum`, `namespace` or parameter properties. Shapes: import
   them with `import type` from `./types.d.mts`; a shape only your module uses is defined beside it and exported. A shape that
   should be shared but is missing from `types.d.mts`: do not add it there (only the lead edits that file); define it beside
   your module and propose it in your report.
3. Imports of converted modules name the `.mts` (`./json.mts`); a `.mts` imports only `.mts` (or node). Your layer's
   dependencies are converted already; if one is not, stop and report it.
4. Helpers: call the owners, never a copy: `readText`, `put`, `isDir`, `walk`, `scratchDir`, `childError` (files.mts),
   `gitRun`/`gitOut`/`gitLines` (git-run.mts, with `cwd` and `env` passed), `shortHash` (hash.mts), `parseJson`/`readJson`/
   `toJson`/`writeJson` (json.mts), `extsOf`/`extPattern`/`emittedFrom` (source-exts.mts). Take every copy in your file out
   and call the owner instead. A copy with one line changed is still a copy.
5. Re-entrancy (W3.3, d-10; the repo lint's gates 11 and 12 hold it): no `process.env`, `process.cwd()`, `process.ppid`,
   `process.exit`, `process.chdir`, `process.stdout`, `process.stderr` or `console.*` outside an
   `if (isMain(import.meta.url))` tail; a value the module read from the process becomes a parameter (`env`, `cwd`, `root`).
   No work at import: the top level only declares (no call that does work, no file read, no `realpathSync(process.argv[1])`).
   No memo without a key that holds the file's mtime. Selftest modules (`selftest`, `*-selftest`, `hub-rig`) are left out of
   gates 11 and 12 (d-20).
6. A signature you change: update every importer in the same commit (`grep -rn "lib/X.mjs" packs lib bin scripts global test`),
   passing what the module used to read itself (an unconverted `.mjs` importer may read `process.env` and pass it on; W4
   converts those). The installed names stay: importers keep importing `./lib/X.mjs`, which the build emits.
7. `npm run build`, then prove it: `npm run check` exit 0; `node --import ./test/fresh-tmp.mjs --test test/repo-lint.test.mts`;
   the selftest of every hook that imports `X` (directly or through another lib): `node packs/base/hooks/<hook>.mjs --selftest`;
   the unit test `test/unit/hooks-lib/X.test.mts` (write it when X has logic of its own: its behaviour, its edge cases, one
   planted wrong input seen handled), run with `node --import ./test/fresh-tmp.mjs --test <file>`; and `npm run test:changed`
   for the tests your change reaches (keep its output in a file; read it before running anything again).
8. Commit by name: `git add <paths>` then `git commit -m "typescript W3 <slice>: X in TypeScript (...)" -- <paths>`. Never
   `git add -A`, `.`, or a path of an emitted `.mjs` (git ignores them; naming one in `git commit -- <paths>` commits the build
   output, so name only sources, tests and the importers you changed). Push the branch after each commit:
   `git push -u origin work/2.0.0-ts-<slice>`.

## A fault you find

Typing that shows a real bug, or an owner's merge that would change a result: do not fix it silently. Write it in your report
(what, where, the input that shows it), keep today's behaviour, and the lead logs it as a KWB and decides it with its test.
A hook that refuses correct work: stop that step, report the exact message. Never route around a refusal.

## Files you may write

Your slice's `X.mts` and the removal of its `X.mjs`; its unit tests under `test/unit/hooks-lib/`; the importers of your files
(only the lines that call them); your status file. Nothing else: never `.gitignore`, `package.json`, `types.d.mts`,
`CHANGELOG.md`, `workflow-bugs.md`, anything under `.claude/`, another slice's files.

## Report

Write `docs/workorders/typescript/agents/<slice>-report.md` in your worktree and commit it: per file, the lines before and after,
the copies you removed (which helper, where), the signatures you changed and their importers, the faults you found, the types
you propose for `types.d.mts`, and each proof's result (check, lint, selftests by name with their case counts, unit tests,
test:changed's pass and fail). End your final message with exactly one status line, `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`
or `NEEDS_CONTEXT`, then the path of your report.
