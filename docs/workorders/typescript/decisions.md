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
