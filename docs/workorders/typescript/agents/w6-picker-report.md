# W6 item 1: the change-to-tests picker on d-7

Branch `work/2.0.0-ts-w6-picker` (from `work/2.0.0-typescript`), two commits, pushed.

## What changed

- `scripts/test-changed-paths.mts` (new): the path function. `lib/x` to `test/unit/lib/x` (+ `x-*` parts); `packs/p/hooks/h` to `test/hooks/p/h` (+ `h-*`);
  `packs/p/hooks/lib/m` to `test/unit/hooks-lib/m` plus the hook tests of every hook that imports `m`, transitively; `packs/p/tools/t` to `test/tools/p/t`;
  `test/kit-cli`, `test/fresh-tmp`, `test/fixtures/**` builders to the integration tier. Then the manifest: `pack.json` `tests` (test paths a pack names; any change
  under the pack picks them) and `requires` (a change under pack P also picks the hook and tool tests of every pack that requires P). No pack names `tests` yet (W7 owns the
  manifests), so that half is read and unused today; `sound-design` requires `audio-core`.
- `scripts/test-changed-graph.mts`: `choose` calls the path function; new `importersOf` (one transitive-importer walk, now also used by `selftestsOf` in
  `test-changed-hooks.mts`, which had its own copy). A hook is run and proved, never picked by import or by name (its own test, its selftest, noop and the table's rows
  are what a hook change reaches). The `docs/**` row (KWB-131) is unchanged. The `.mts` import graph and changed-function reading were already in place from W2.6/W4.
- `lib/selftest-cache.mts`: a hook's key is the shared hash (runner, node, platform, detector, guards; the libs are out of it) plus the bytes of the hook and every file it
  imports, directly or through others (`importsOf`). A lib change reruns only the hooks that import it, not all of them. Default memory `~/.cache/claude-packs/selftests`;
  `CLAUDE_PACKS_SELFTEST_CACHE` still wins (test/fresh-tmp sets it). The `doctor.mts` and `test/kit-cli.mts` callers keep their signatures.

## Plants (test/integration/test-changed-plants.test.mts, test/unit/lib/selftest-cache.test.mts)

- A fault planted in a hook lib: the picked set (the hook's tier test, found by path only) goes red. Seen red with the path call fed an empty file list, green with it.
- A changed transitive import of a hook misses the selftest cache; a lib the hook does not import leaves its key alone (unit and integration, the latter on the real `no-find` copy).
- A change under `docs/` picks `test/repo-lint.test.mts`.
- A hook change (`git-guard`) picks exactly its own test and noop; the path function's own cases per tier. The first version of the hook plant went red for the right reason
  (hooks were still picked by function-name use: 100+ tests); fixed by not picking hooks by content.

## Proof

`npm run build` and `npm run check` exit 0. `test-changed.test.mts` (7), `test-changed-plants.test.mts` (5), `selftest-cache.test.mts` (7): all green.
Hook touch (`packs/base/hooks/no-find.mts`, a real exported line, then removed), `node scripts/test-changed.mjs --dry-run --base HEAD`:

    chose 2 of 314 test files:
      test/hooks/base/no-find.test.mts      (path: hook no-find is covered by test/hooks/base/no-find)
      test/integration/noop.test.mts        (an installed file changed)
    selftests to prove (1): no-find.mts

(`--base work/2.0.0-typescript` lists the same two once this branch's own files are committed on top; they were listed beside it while the branch was uncommitted.)
A comment-only touch picks no test and still proves the selftest (existing rule: imports or comments only).

## Decisions taken (unattended)

1. `fresh-tmp` reaches the integration tier by path (the spec's list), so the old assertion "its own test, fewer than 5" is now "its own test, the integration tier and the repo lint".
2. `test-changed.mjs`'s test list gained `test-changed-plants` (the split part imports the picker), asserted in the existing "kit's own map" test.
3. Test names kept; `selftest-cache.test.mts` keeps "the shared hash changes with a lib file, ..." but its body now asserts the runner (not a lib) moves the shared hash, with a comment and a
   new test beside it for the lib in each hook's own key. Rename to be done by W5's name mapping owner if wanted.
4. Hooks are not picked through imports or names. A test that only imports a hook (no tier path) is no longer chosen for a change to it; the selftest and tier test cover it.

## Measured against W0's picker (`e35a0d2`, "W0 done", in `build/w0`; 9a7f1c0 is not a commit of this repo)

W0's picker reads only `.mjs` tests, so on the current tree it sees no tests at all (0 of 0). The historical diffs below were run with both pickers on each commit's own tree
(`build/diff`, a detached worktree of that commit, `--base <commit>^`). Those trees pre-date the tier moves for hook tests, so the tier path rows had little to find; the
current-tree table afterwards is where the new picker shows the tiers. Both pickers see the diff's `docs/`, lock and `workflow-bugs.md` lines.

| diff | W0 picks | new picks |
|---|---|---|
| `baa2235` (hook `build-guard.mts` + noop, global tests) | 30 of 87 | 34 of 145 (+ repo-lint, unit/lib backup, coverage, global via `.mts` tests; selftest build-guard) |
| `ebb5280` (lib `workorder-check.mts`) | 0 of 87 (no `.mts` test seen; "no test covers lib/workorder-check.mts") | 2 of 149: `test/unit/lib/workorder-check.test.mts`, `test/workorder-check.test.mjs` |
| `81267a7` (test helper `kit-cli.mts`, hook rig) | 0 of 0 | 112 of 272 (kit-cli's importers across the hook, unit and integration tiers; `hook-selftests`, `hook-rig` changed) |
| `e9744da` (hook lib `making-check-turn`, docs) | 24 of 87 (noop, install, house ...; "no test covers making-check-turn") | 27 of 155 (the same plus `unit/lib/sync`, `workorder-check`, `no-personal-name`, `test-changed`; selftests making-check, making-check-count) |

The full lists are `build/pick-<commit>-w0.txt` and `build/pick-<commit>-new.txt` (ignored folder, kept in this worktree).
Pre-tier trees, so the per-diff counts are a coarse comparison; W0 is wider on old `.mjs` suites because it picks by name across `docs/` and lock changes too.

Current tree (same touch, a real appended export, on a detached copy of this branch's tip; W0: 0 of 0 on each, it sees no `.mjs` tests):

| touch | new picks |
|---|---|
| `packs/base/hooks/no-find.mts` (a hook) | 2 of 314: its test, noop; selftest no-find |
| `packs/base/hooks/lib/making-check-turn.mts` (a hook lib) | 4: `unit/hooks-lib/making-check-turn`, hook tests `making-check`, `making-check-count`, noop; selftests of both hooks |
| `lib/layout.mts` (a lib) | 9: `unit/lib/layout`, `unit/hooks-lib/layout`, integration: `configs-layout`, `configs`, `custom-packs`, `install-block-plugin`, `install-block`, `worktrees`, + the plants test |
| `test/kit-cli.mts` (a test helper) | 59: the integration tier (about 57 files) + `test-changed`, `test-changed-plants` |

## Needs from others (files I may not write)

- `types.d.mts`, `package.json`, `.gitignore`: none.
- `.claude/hooks`: the `template-law` hook refused a second copy of a transitive-import walk (`own-processes` `descendants`); resolved by extracting `importersOf`, so it was right. Not marked wrong.
- W7 (pack manifests): add `tests` to `pack.json` where a pack's tests are not at the path (a pack's `requires` is read today: sound-design to audio-core).
- Rule slip, for the record: one early file rewrite was made with a python heredoc (`lib/selftest-cache.mts`) before the hook told me; the file was read back and its key function re-edited with Edit; the result is judged by the type-check and tests.
- `lib/doctor.mts` and `test/kit-cli.mts` call `sharedHash`/`selftestKey` unchanged.
