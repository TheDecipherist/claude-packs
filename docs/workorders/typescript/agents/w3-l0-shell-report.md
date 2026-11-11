# W3 layer 0, slice w3-l0-shell: report

Branch `work/2.0.0-ts-w3-l0-shell` (pushed), commit 2be4f9c plus this report.

## Per file (lines before -> after)
- shell-lex: 78 -> 142. Now also exports `dropHeredocs`, `blankQuotes`, `splitCommand(text, {newline, background, subshell})`,
  `installedPackages(command) -> [{part, packages}]`, and types `Token`, `Heredocs`, `SplitOptions`, `Install`.
  `cutHeredocs` and `lex` behave as before. The backtick in the control-operator regex is now `\x60` (the repo lint's blanker
  read a backtick in a regex literal as a template string and flagged later comment lines; gate 12).
- program-read: 199 -> 245. Types `Lang`, `Value`, `Scanned`, `EvalContext`. `process.env.HOME` (Path.home) became `ctx.home`.
- command-prefix: 36 -> 36. git-adds: 21 -> 27 (type `GitAdd`; now calls `dropHeredocs` and `splitCommand`).
- apply-edit: 20 -> 28 (type `EditResult`; reads through `readText`). secret-patterns: 18 -> 22 (type `SecretPattern`).

## Copies removed
- git-adds: its inline heredoc regex and `&&|\|\||;|\|` split now call `dropHeredocs` and `splitCommand` (shell-lex).
- apply-edit: `existsSync`+`readFileSync` now `readText` (files.mts). Behaviour difference, kept as the owner's: a file over
  8 MB, or a directory, reads as '' (before: read whole / threw).
- No other copy of the four owners lived in my slice's files.

## Signatures changed and importers
- `evaluate(expr, ctx)` ctx gains `home`. Importer `packs/base/hooks/lib/program-writes.mjs` passes `home: process.env.HOME`
  (W4 converts it). No other signature changed. Importers keep `./x.mjs`.

## Copies of the four owners outside my slice (for the later slices)
Heredoc cutting (regex, `dropHeredocs`-equal unless noted):
- packs/full-stack/hooks/stack-guard.mjs:46; packs/postgres/hooks/db-wipe-guard.mjs:52; packs/base/hooks/git-guard.mjs:107;
  packs/base/hooks/suite-once.mjs:53; packs/base/hooks/no-find.mjs:29 (all the identical `dropHeredocs` regex).
- Variants (need the marker-line form `[^\n]*\n ... \n\s*\1`): packs/synth-creator/hooks/spec-lock.mjs:58, time-guard.mjs:79 and :132,
  global/hooks/version-pin-guard.mjs:113 (`HEREDOC`); line-walkers: packs/synth-creator/hooks/build-guard.mjs:39 (`stripHeredocs`),
  global/hooks/shell-traps.mjs:15 (`noHeredocs`); packs/base/hooks/lib/languages.mjs:25 (source heredoc, different job);
  packs/gpu-painter/hooks/browser-guard.py:71 (Python).
Quote blanking (`blankQuotes`): build-guard.mjs:50 (`blankQuotes`) and :52 (`maskQuotes`, keeps length: a different function),
  stack-less copies in db-wipe-guard.mjs:52, suite-once.mjs:53, no-find.mjs:29, spec-lock.mjs:58, global/hooks/shell-traps.mjs:26,
  packs/base/hooks/lib/compile-cache.mjs:20.
Command splitting (`splitCommand`): stack-guard.mjs:46 (plain), inside-the-project.mjs:84 and git-guard.mjs:49 (`{newline}`),
  git-guard.mjs:111 (`{newline, subshell}`), suite-once.mjs:55 (`{newline, background}`), no-find.mjs:30 (`{newline, background}` plus
  only `$(` and backtick, not parens: needs a variant or a fourth option), stage-guard.mjs:13, time-guard.mjs:81,
  global/hooks/version-pin-guard.mjs:119 and :139, build-guard.mjs:59 (keeps the separators), browser-guard.py:56.
`installedPackages`: packs/full-stack/hooks/stack-guard.mjs:46-50 (identical logic; its `judgeInstall` can loop
  `installedPackages(command)`), global/hooks/version-pin-guard.mjs:124 (also pip/uv/poetry; bigger).
  Caution: `global/` installs hooks that import shell-lex, so any global hook using the new owners needs only shell-lex (already in FILES).

## Faults found (not fixed)
- Pre-existing, not mine: `lib/global.mjs` `FILES` lacks `files.mjs`, which `shell-writes.mjs` and `program-writes.mjs` import
  (since W2). A global install then fails `global doctor` ("version-pin-guard.mjs --selftest fails", MODULE_NOT_FOUND files.mjs).
  The lead adds `['../packs/base/hooks/lib/files.mjs', 'hooks/claude-packs/lib/files.mjs']`. shell-lex, command-prefix and
  program-read import nothing new, so nothing of mine must be added.

## Proposed for types.d.mts
None needed. `Token`/`Value`/`EvalContext` are used only by shell-lex/program-read/program-writes/shell-writes; leave beside the modules.

## Proofs
- `npm run check`: exit 0. repo-lint test: pass (gates 11 and 12 green after the `\x60` fix).
- Selftests OK: once-only 18, secrets-guard 16, suite-once 34, no-find 18, git-guard (18 token, 44 house, 32 pass, 25 pushed, 9 owner, 9 trunk),
  repo-litter 10, folder-law 16, inside-the-project 16, template-law 26, code-shape 19, shape-law 58; version-pin-guard 26 (direct).
- `test/routes.test.mjs`: all 23 route tests pass (the one failure in that run was gate 12, fixed afterwards; repo-lint re-run green).
- Unit test `test/unit/hooks-lib/shell-lex.test.mts` (also covers command-prefix, git-adds, program-read, secret-patterns): 8 pass.
- `npm run test:changed -- --base work/2.0.0-typescript`: 10 files chosen, 65 pass, 6 fail, none from this change:
  global x2 (files.mjs missing from FILES, above); no-personal-name (names in docs/workorders/typescript PROMPT.md, workorder.md,
  probes/proxy/*.mjs, from the lead's own files); noop.test x3 (stellix, sub37, full-stack "same files": update listings, no
  file of mine involved; not investigated further). I did not run them on the bare lead branch to compare.
