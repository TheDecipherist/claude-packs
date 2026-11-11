# Decisions: work order typescript

Each row: the question, the options, the choice, why. d-1 to d-13 are the order's own (workorder.md, "Decisions taken by this
order"), recorded here at W0; the user may overturn any by editing the order. d-14 on are the run's.

## d-1 The branch {#d-1}
- Question: where does the order's branch start?
- Options: the trunk `main`; `work/1.9.0-platforms` (every fix of 2026-11-11, unreleased).
- Chosen: `work/2.0.0-typescript` from `work/1.9.0-platforms`; 1.9.0 is not published on its own, its CHANGELOG section folds into 2.0.0.
- Why: the unreleased fixes would otherwise be merged twice; open-work section 1.

## d-2 The emit layout {#d-2}
- Question: where does the emitted `.mjs` go?
- Options: beside its `.mts` (`rewriteRelativeImportExtensions`), ignored by git; a `dist/` mirror.
- Chosen: beside; the installer skips `.mts`, `.d.mts`, `.map`, `.tsbuildinfo`; `files` excludes them; no per-folder `.gitignore`.
- Why: every path import in lib, bin, global and the kit's own install keeps working, and installed files are byte for byte what tsc
  wrote; `dist/` rewrites every path and copies the content twice (typescript-tooling 4, cli-lib 2). `test/` is not emitted
  (`tsconfig.test.json`, `noEmit`). A types-only module is a `.d.mts`.

## d-3 The dependencies {#d-3}
- Question: what does the kit depend on for TypeScript and the language server?
- Options: `typescript` 7.0.2 alone with `tsc --lsp --stdio`; or that plus `typescript-language-server` 6.0.3 with `typescript` 6.0.2 aliased.
- Chosen: `typescript` 7.0.2 and `@types/node` newest 22.x as devDependencies; Go pinned for the proxy build. The server: open until
  W1's probe (recommended: `tsc --lsp` if it answers definitions and references on `.mts` through the LSP tool in a fresh session).
  **Completed at W1.1 (2026-11-11): `tsc --lsp --stdio` from `typescript` 7.0.2.** A fresh child session's `LSP` tool answered
  goToDefinition, findReferences (75 references in 28 files) and incomingCalls (33) on a `.mts` (findings {#w1-1}); the pair with
  TypeScript 6 is not taken, so the kit carries one dependency for both the build and the server.
  The LSP declaration ships as a plugin folder `.claude-plugin/` with `lspServers`, enabled in `.claude/settings.json`, the global
  `typescript-lsp` plugin disabled there.
- Why: what ships is `.mjs`; typescript is not a runtime dependency.

## d-4 What the tests import {#d-4}
- Chosen: unit tests import the `.mts` sources (node's type stripping); the hook tier runs each hook's emitted `.mjs`; the integration
  tier installs from the packed tarball; one test asserts a hook's emitted verdict equals its source's. Dev needs Node 22.18+.
- Why: the LSP and compiler see each test as a reference, and the shipped code is what is proved.

## d-5 TypeScript enforced in projects {#d-5}
- Chosen: at `init`, a `node` or `full-stack` project, or one taking `js-ts`, gets typescript and the server as devDependencies, a strict
  tsconfig where none, the LSP declaration and the `typescript-only` check; doctor red without them; existing projects via `enable`.
- Why: the kit asks projects for TypeScript; no new law switches on silently.

## d-6 The test tiers {#d-6}
- Chosen: `test/unit/lib/`, `test/unit/hooks-lib/`, `test/hooks/PACK/`, `test/tools/PACK/`, `test/integration/`, `test/repo-lint.test.mts`;
  one install per configuration built once per run and copied per test.
- Why: a changed file's tests become a path function (tests survey section 7).

## d-7 The change-to-tests map {#d-7}
- Chosen: the path function first, then `pack.json` `tests` and `requires`, then the `.mts` import graph; the selftest cache keyed per
  hook plus its transitive imports; `docs/**` reaches the repo lint (KWB-131).

## d-8 Generated, never hand-kept {#d-8}
- Chosen: one generator, `scripts/counts.mts`, run by the release, for the README tables, the site counts, the per-version manifest,
  `docs/rules-without-checks.md`, the versions rows, the status-line sample and the planner's version lines; `--check` replaces the
  count tests.

## d-9 Runtime in a project {#d-9}
- Chosen: one runner per event, git-guard's Stop verdict cached and capped at 1 s, a per-session git state file, doctor's per-event
  budget, constant checks cached by kit version, `loadCustomPacks` only on init/add/update.

## d-10 A resident runner behind a Go proxy {#d-10}
- Chosen: one daemon per project folder, hooks loaded once, a unix socket named by a hash (user id, project realpath, lock hash, node
  path) in a mode-700 folder; a Go client per event that falls back to the TypeScript runner and never fails open silently; a per-event
  `ctx`; judges in parallel in a worker pool, recorders serial; refusals sorted by table order.
- Why: the user, 2026-11-11; review-2 sections 1 to 4; 16 ms an event against 85 ms on the prototype.

## d-11 Slice branches {#d-11}
- Chosen: `work/2.0.0-ts-SLICE` from the order's branch, in worktrees under `.claude/worktrees/SLICE`.

## d-12 Replaced tests {#d-12}
- Chosen: W5's name diff allows exactly the replaced set (the 11 reader files into repo-lint, the 5 count tests into `counts --check`,
  the hand-number assertions of json-ratchet, kf-refusals' totals, names-sweep's 2000, base-neutral's moved list).

## d-13 Where the binaries live {#d-13}
- Chosen: four binaries built reproducibly by `scripts/build-proxy.mts`, shipped in the tarball under `packs/base/hooks/bin/OS-ARCH/`;
  a project gets only the `sh` picker `.claude/hooks/bin/hook-proxy`, which execs the binary from the user's cache or falls back to
  `node .claude/hooks/run-hooks.mjs`.
- Why: projects commit `.claude/`; a binary there breaks other platforms and bloats git (review-2 5.1).

## d-14 Where the baseline is measured, and the admiral merge's gate {#d-14}
- Question: W0.5 says "on the branch's first commit"; W0.2 asks for the merge's picked tests green. Measure on 905e6be, or after W0.1 to W0.6?
- Options: check out 905e6be in a worktree and measure there; measure on the branch after W0.1 to W0.4 and W0.6.
- Chosen: after them (9c0c30d and on). No code is converted before W2; the differences are the admiral skill (content), suite-once's
  KWB-168 grant (which W0.6 needs before the baseline can run) and the order's own docs. The whole-suite run (a) is also the merge's
  gate: it is a superset of the 58 files `test:changed` picked for it.
- Why: the "before" must be the kit as W1 starts from; a second whole-suite run on 905e6be would cost 13 minutes and differ by one skill.

## d-15 What a one-file gate touches {#d-15}
- Question: W0.5(b)/(c) say a file "touched". A comment line picks no test (the picker reads changed functions, KWB-166).
- Chosen: a no-op statement on the first line of the file's first top-level function (`probes/baseline.mjs` `FIRST_FUNCTION`), the same
  at W6 and W11 on the `.mts`.
- Why: a real one-hook change is a change inside the hook's code; a comment would measure a gate that runs nothing.

## d-16 Where the tests' tsconfig lives {#d-16}
- Question: W2.1 names `tsconfig.test.json` at the root; placement-law puts a file of the "tests" kind in `test/`.
- Options: ask for a layout exception; `test/tsconfig.json` extending `../tsconfig.json`.
- Chosen: `test/tsconfig.json`, and `npm run check` runs `tsc --noEmit -p test/tsconfig.json`.
- Why: it meets the law as written, it is the usual place, and an editor finds it for every test file.

## d-17 The kit's own install keeps being tracked {#d-17}
- Question: `.claude/hooks/lib/` now holds installed copies of emitted files (`files.mjs`, `git-run.mjs`, `source-exts.mjs`); the
  order says never commit an emitted `.mjs`.
- Options: ignore the kit's installed copies too (a fresh clone has broken hooks until `update --dir .`); keep tracking the kit's
  `.claude/` as it always was.
- Chosen: keep tracking `.claude/`. The rule is about the source folders (d-2): an install is what a project commits (bandwarp
  tracks 398 files there), and the kit's own hooks must work in a fresh clone before any build.
- Why: easiest to reverse; nothing a project receives changes.

## d-18 When the owners inside existing modules are made {#d-18}
- Question: W2.5 lists owners that live in modules W3 converts (`runAsHook` in hook-log, shell-lex's heredoc cutting, quote
  blanking, command splitting and `installedPackages`, selftest's `runHook` returning the full result, json a leaf). Make them in
  W2 by converting those modules early, or as their layer is reached?
- Chosen: the new modules now (files, git-run, hash, source-exts, and `HOOK_FILE` in lib/packs.mjs); the owners inside existing
  modules as W3 converts each (shell-lex and selftest at L0, json at the W2.10 pilot, hook-log at L2), each before its first user
  converts onto it, so a file still imports only converted files.
- Why: converting hook-log in W2 drags its layer (layout, event-log) with it; W3's order is what keeps every slice green.

## d-19 What the W2.10 pilot converts {#d-19}
- Question: the pilot names json, project, files and git-run, and `.claude/hooks/kit-lock.mts`.
- Chosen: json, files, git-run (and hash, source-exts) converted; lib/kit-lock.mjs converted to lib/kit-lock.mts (its readLock renamed
  readLease, the lease, apart from manifest's install lock); `.claude/hooks/kit-lock` stays `.mjs` with W2.10's fix (it imports the
  installed `./lib/writes.mjs` and `./run-hooks.mjs` and the emitted `lib/kit-lock.mjs`, never a source path) and becomes `.mts`
  when `writes` is converted (W3 L3), since a `.mts` may import only typed modules; project converts at W3 L0 with its `ctx` form.
- Why: project reads `process.env` and `process.cwd()` at import (gate 11) and its `ctx` form changes what 23 importers call,
  which is W3.3's work; converting it now would make the pilot either fail gate 11 or change 23 files outside its layer.

## d-20 Selftest modules and gates 11 and 12 {#d-20}
- Question: gates 11 and 12 forbid process globals and work at import in a hook or hook-lib module; `selftest.mts` and the
  `*-selftest` and `hub-rig` modules spawn processes with the process's env by design.
- Chosen: those modules are left out of gates 11 and 12 (repo-lint `SELFTEST_ONLY`); every other hook and hook-lib module is held.
- Why: a selftest module runs only under `--selftest` (W3.2 moves look-gate's and skill-first's to a dynamic import there), never
  inside the resident runner, which is what the two gates protect.

## d-21 A layout folder holds a file from the day it is named {#d-21}
- Question: W0.1 named folders ahead of their content; a fresh clone has none of them and the kit's doctor is red there (KWB-175).
- Chosen: the five source folders hold a README.md saying what goes there and which step fills it (test/hooks, test/tools,
  test/integration, test/fixtures/profiles, proxy); `packs/base/hooks/bin` leaves the layout until W8 writes its first file (the
  sh picker), since anything in it installs into every project; `build/evidence` leaves it for good (ignored, never source).
- Why: the layout says what exists; a README is the cheapest true first file, and no project receives one.

## d-22 Two real-path helpers, each its own job {#d-22}
- Question: the surveys list `real` three times; dup's walks up to the nearest existing parent for a path that does not exist yet
  (`/var` against `/private/var` for a file about to be written), project's resolves it as written.
- Chosen: project.mts `real` is the owner; dup.mts keeps `realPath`, built on it, for paths that may not exist (a new file's).
- Why: the two give different results for a missing path (the order's own example of an owner's merge that would change a result);
  merging them changes what once-only matches, which wants its own KWB and test if it is ever wanted.

## d-23 hook-log is the hooks' process boundary {#d-23}
- Question: gate 11 forbids process globals in a hook-lib module; hook-log's `asHook` reads stdin, writes stderr and exits, and its
  `projectRoot()` reads CLAUDE_PROJECT_DIR (31 hooks call it since W3 layer 0).
- Chosen: hook-log.mts is left out of gates 11 and 12 by name, with the selftest modules (d-20); everything else in it is held to
  the brief.
- Why: it is the one module whose job is to bind a hook to its process; under the resident runner (W8) a hook is called with its
  event and `ctx` and never touches hook-log's process side, and W4 replaces every `projectRoot()` call with `ctx.projectDir`.
