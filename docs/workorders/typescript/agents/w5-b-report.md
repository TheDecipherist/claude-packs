# W5 (b), the hook tier: report

Branch `work/2.0.0-ts-w5-b` (pushed). Four forks of one agent wrote disjoint skeletons and migrated disjoint old files; this is the merged account.

## What exists

- `test/hooks/hook-rig.mts`: `holdsTheContract` (the selftest passes in an install; the worktree case holds in a real git worktree of a fixture copy; the emitted `.mjs` gives the verdict the `.mts` source gives, same status, stdout and stderr), `extraFixture` (an install no fixture names, built once per run by the same build lock), `enable`, `enabledFixture`, `worktreeOf`, `sourceRun`. Also `test/hooks/routes.mts`, `work-project.mts`, `lesson-cases.mts`, `command-case.mts`, `rust-crate.mts`, `ui-craft/checks.mts` (shared helpers).
- One `test/hooks/PACK/HOOK.test.mts` for every installed hook (49 hook files in `packs/*/hooks`, none missing; checked by a loop). Each begins with the contract, then the refusals the old files held for it.
- All 33 root test files `git rm`'d as their own step. 0 of them left. `npx tsc --noEmit -p test/tsconfig.json` clean.

## Files moved (old -> new)

- `kf-refusals` -> base shape-law, making-check, once-only, dispatch-once, code-shape, git-guard; synth-creator protect-vendor; midi and cpp lesson-checks.
- `kf-fail-open` -> base run-hooks, suite-once, git-guard; audio-core param-id-lock. `logging` -> base run-hooks.
- `install-fixes`, `kit-guards`, `sub37-wb`, `micro` -> git-guard, shape-law, js-ts lesson-checks, protect-vendor, file-size-guard, frozen-files, stage-guard, base-install, hook-selftests. `other-projects` -> base/other-projects. `core-budget` -> base/core-budget.
- `routes` -> each hook's file (folder-law, placement-law, file-size-guard, lesson-checks, once-only, shape-law, brief-guard, realtime-guard, param-id-lock, no-shipped-images, browser-guard, protect-vendor, frozen-files, spec-lock) and a new global/version-pin-guard.
- `instances`, `shape` -> base/shape-law (two to base-pack). `once-only` -> base/once-only. `cpp-pack` -> cpp/cpp-pack, cpp/lesson-checks, base/template-law. `rust-dry` -> template-law, dispatch-once, rust/lesson-checks. `content-sites` -> lesson-checks, secrets-guard, repo-litter, content-site/lesson-checks, base-pack. `structure`, `base-laws` -> placement-law, base-pack.
- `lookup`, `review-packs`, `audio-packs`, `every-language`, `stored-text`, `ui-craft`, `ui-depth`, `writing`, `what-the-kit-finds` -> per-pack `lesson-checks.test.mts` (base, js-ts, mongo, stored-text, ui-craft, writing, python, multi-tenant, synth-creator, http-api, react, websocket, host-agent, go, dynamic-data, ci, midi, sound-design, instrument-shell, reverse-engineering, cpp, postgres, rust), a few into secrets-guard, dispatch-once, repo-litter, code-shape, firmware-out-of-git, and the pack files below.
- `rust-pack`, `postgres-pack`, `full-stack`, `hover`, `vst3host`, `kf-build-laws` -> rust/lesson-checks and rust-pack, postgres/lesson-checks, db-wipe-guard and postgres-pack, full-stack/stack-guard and full-stack-pack, gpu-painter-pack, sound-design-pack, audio-core-pack; "a plain src/" -> base/folder-law.

## Names

Checked by a script over all 256 old titles (templated ones as templates): every title is present in `test/hooks` except one. No renames.
- Replaced (d-12): `the fixture is the whole log: 14 marked wrong, 15 marked right` (kf-refusals) -> `the fixture is the whole log: every row is marked wrong or right, with its id and its lines` (base/shape-law.test.mts); the inner `held.length === 8` is now `> 0`.
- Test-body edits: WB-4 runs selftests through `doctor --fresh` and asserts the planted protect-vendor is the only failure; the kit-guards branch-delete scan includes `.mts`; core-budget's `gentle` call drops `timing: true` (option gone).

## Decisions (unattended)

1. Tests with no single hook (suggest, doctor, scan, profile, rule and skill installs) sit in `test/hooks/PACK/PACK-pack.test.mts` (or `base-pack`, `base-install`, `hook-selftests`, `core-budget`, `other-projects`, `ui-craft-gate`, `page-measure`, `writing-configurations`, ...), because (b) may write only `test/hooks/**`. The lead may move them to `test/integration/` or `test/unit/`; `core-budget` is a unit test of a hook lib.
2. A pack's checks fired through the base lesson-checks hook go to `test/hooks/<pack>/lesson-checks.test.mts`.
3. `holdsEachCase` is not used: `holdsEachCaseIn(install, cases)` in `test/hooks/lesson-cases.mts` runs the cases on copies of one install (review-packs: one 10-pack install; audio-packs: one install without cpp, because cpp's `cpp-no-mutable-global` refuses the midi and sound-design good examples; cpp cases on a synth-creator+cpp install). (d)'s all-packs fixture can replace it.
4. `test/worktree-rig.mts` (share d's) edited minimally: `project()` now calls a new exported `checkoutsOf(dir, before)` so the hook tier builds a worktree from a fixture copy (once-only refused the duplicate). Expect a small merge hunk with (d).
5. kit-fresh has its own worktree case (temp `CLAUDE_PACKS_CACHE_DIR`), because the shared case reads npm's answer from the user's cache or the network (tests-never-touch-user-files).

## `init` sites left in my files (about 19 `run`/`cli` init sites, each install-as-subject)

base-install 2; placement-law 1 (Sub37 profile over existing files); shape-law 1 (`init gpu-painter` alone); cpp-pack 1 (synth preset); folder-law 1 (python `init --auto`); rust-pack 5 (`init --auto` on a crate, `init mongo`); postgres-pack 1; full-stack-pack 1; reverse-engineering and ui-craft/writing suggest, `--auto` and "new project" tests (init is the subject); the build lambdas of `extraFixture` (once per run, not per test).

## Refusals met

- once-only on the first `hook-rig.mts` (its `checkoutsOf` repeated `project()`): right; fixed by the extraction above.
- once-only on `routes.mts`, `run-hooks.test.mts`, `hook-selftests` while the old copy stood: right; old copy cut first, heartbeat and run-hooks worktree cases written as tables.
- untrusted-boundary on `untrusted-boundary.test.mts` and `js-ts/lesson-checks.test.mts` (a model-call string in a lint fixture): the first right (added `// untrusted: none`); the second (id `8946cc65`) marked wrong (`logs mark ... wrong`: it read `client.messages.create` in a fixture string as a model call) and answered with the same marker. once-only `741581ad` marked right.
- Not recorded with `logs mark`: the other once-only and untrusted-boundary ids (the worktree's `logs refusals` was empty); I met no further refusal myself except no-find on a `find` I typed.

## Hook bugs found (reported, not fixed)

- `kit-fresh` reads `CLAUDE_PACKS_UNATTENDED='0'` as unattended (`Boolean(env[...])`), while `agents-held` reads `'0'` as someone present. The test uses an empty string (`kit-fresh-look.mts`).
- `KF-21` (git-guard refuses `git checkout --theirs` outside a merge) is red on the base too: git-guard returns 0 because untracked-only dirt is not dirty. The test is kept as it was.
- Fixture `python+shell` (`--config python shell`) installs no python pack checks (`py-no-bare-except` and others missing); the python lesson-check test uses `extraFixture('python-shell', ['python', 'shell'])`. (d) should check its args.

## Proofs

- `npx tsc --noEmit -p test/tsconfig.json`: 0 errors. Every file written was run green by the fork that wrote it.
- `npm run test:changed -- --base work/2.0.0-typescript` (output `/tmp/w5b-changed.log`, 98 of 215 files, 8 min 9 s, load high with other agents): 491 tests, 486 pass, 5 fail. Four are the known base reds: KF-21, the house test (`the house hooks install where they belong, ...`), `doctor fails when a hook fails its selftest`, worktrees' kit-fresh case (the old shared case, (c)'s file). The fifth, `a pack that is not base: an edit picks what checks it, an added file the counts` in `test/test-changed.test.mjs` (asserts `78 of 215`), is (c)'s file and reads the picker over the tree; it needs the lead's look once (c) and (b) are merged.
- Seconds per file, measured by the forks under a load average of about 10 (inflated; no suite-log sum was taken): git-guard 138, run-hooks 88, other-projects 85, base-install 71, shape-law 166 (with other forks' appends), base-pack 109 to 174, protect-vendor 60, hook-selftests 57, gpu-painter-pack 175, full-stack-pack 98, writing-configurations 125, page-measure 72 (real Chrome), rust-pack 60; the rest under 60. About 14 s of any first file is the one-off fixture build. Likely over 60 s summed on a quiet machine and worth a split by the lead after re-timing: shape-law, base-pack, gpu-painter-pack, full-stack-pack, writing-configurations, git-guard.

## Concerns

- Several files may exceed 60 s summed (above); not re-timed on an idle machine.
- The emitted-vs-source test runs the `.mts` from a merged copy of every pack's hook sources (`sourceHooks()` in the rig); a hook whose source cannot run under node's type stripping would show it.

DONE_WITH_CONCERNS
