# w10-testfix report (findings 4, 6 and 7 of review/w10-tests.md)

Branch `work/2.0.0-ts-w10-testfix` from `work/2.0.0-typescript`, pushed. Gate: `npm run test:changed -- --base work/2.0.0-typescript` is green (250 pass, 0 fail). `node scripts/counts.mts --check` is green. `doctor --strict` OK.

## Finding 4: the pack-content ratchet

Script: `scripts/pack-content-fix.mts` (committed, re-runnable, `--dry-run`). It inserts text and parses each file again to prove it. No rule's Always or Never line changed: the R6 edit only adds a line to (or a `## Check` section at the end of) a rule, and the diff of `packs/*/rules` has no removed line.
- C2: `"exclude": []` added (the engine reads a missing one as `[]`, so behaviour is the same). 34 of 35 fixed.
- C6: `"code": false` added where `"code": true` makes the check's own bad or good example fail (the script runs `selftest` on both forms), plus 3 audio-core checks edited for C2 (a changed file must pass the whole set). 99 files left: both forms pass, so the author decides.
- C7: three `why` texts reworded by hand (the Stellix name removed from two gpu-painter checks and one sound-design check); 2 of 3 landed.
- R6: a line "Lesson check(s) for this rule: `id`, ..." added to the `## Check` section, 54 of 75 rules. `base/rules/agents-held.md` was not touched (it did not fail R6).
- Why not all: `test/pack-content.test.mts` law 2 makes a file edited on the branch pass the whole set. 25 files that also fail C5, R1 or R7 would have turned that test red if edited for C2, R6 or C7 alone, so the script leaves a file whole when it also fails a check a person judges. Take those in one edit with the person's checks.

Ratchet counts (files failing), before then after:
C2 35 -> 1; C5 29 -> 29; C6 139 -> 99; C7 3 -> 1; R1 83 -> 83; R6 75 -> 21; R7 21 -> 21; S3 15 -> 15; S4 23 -> 23; S7 11 -> 11; S8 11 -> 11. The file's comment says a zero row is dropped.

"Never forced down": `ratchetBreaks` (test/pack-content.test.mts) now also reports a stored count above the measured one ("the ratchet holds 5 but 4 files fail: lower it to 4"). Plant: `{R1: 5}` against `{R1: 4}` and against `{}`. Red: with the new filter switched off the run failed 2 tests (the plant test, and "a file new or changed ..." from my then unreverted files). Green after the filter was restored.

## Finding 6: noop's oracle

- `test/fixtures/noop/pinned-manifest.json`: the manifest a person has read. `test/integration/noop.test.mts` now compares each `update` with it, not with `packs/manifest-2.0.0.json`, and its failure message says to read the list and run `node scripts/noop-pin.mts`.
- `scripts/noop-pin.mts` is the only way the pin changes. It prints every file that differs (project: path: changed / not in the pin / in the pin, not installed), then pins; `--check` prints and exits 1. `drift` moved there from the test (once-only refused a copy). The last pin printed 15 differences (the reverts below), which is the reviewed diff.
- Plant: the existing "installed file not listed and one changed" test, now over the pin. It was not run red against a real unlisted change; the pin printing 15 differences when pack files change is the only evidence of that.
- Consequence for the others: any change to an installed pack file is red in noop until `node scripts/counts.mts` then `node scripts/noop-pin.mts` and the diff is committed.

## Finding 7

- base-neutral: `leftBaseStillThere(root)` in `test/repo-readers.mts` (no list: a file of rules, hooks, tools, skills or checks in `packs/synth-creator` that `packs/base` also holds); test in `test/repo-lint.test.mts` with a plant (a hook in both is found). Not seen red before writing.
- release: `Facts.remoteHead` (`git ls-remote` of the remote's main) in `scripts/release-state.mts`; `refusals` refuses when it differs from the fetched trunk ("is not the remote's main") or is empty ("the remote has no main"). Plants in `test/unit/release.test.mts`. This touches `scripts/release-state.mts`, outside the files the brief named; one field and one line.
- layout-owned: the skip of `lib/config-merge.mts` is now only the `own` key, so any other key read there is checked.
- README plants: a test in `test/counts.test.mts` removes a configuration row (`go`), a preset row (`node-api`) and a command row (`lock status`) from the generated README and asks for stale or an error.

## Left for a person (listed, with files)
C5 (4 files edited-whole by them): docker/checks/no-crlf-in-scripts.json, rust/checks/rust-wildcard-dependency.json, shell/checks/sh-rm-guarded.json, sound-design/checks/preset-name-no-brand.json (this one also holds the C7 reword and a C2 for them) and the other 25 C5 files in the ratchet. R1 (83): all rules with raw `paths:`. R7 (21), S3 (15), S4 (23), S7 (11), S8 (11): all as the review lists. C6 (99): both forms pass. Files with C2, C6, C7 or R6 left because they also fail those: cpp/rules/cpp-builds-everywhere.md, gpu-painter/rules/gpu-frame-work.md, js-ts/rules/await-handled-at-a-boundary.md, mongo/rules/one-client-one-pool.md, reads-aggregate-writes-bulk.md, stellix/rules/world-fp-determinism.md, ui-craft/rules/forms-never-fight.md, midi, postgres, reverse-engineering, sound-design and synth-creator rules named under R1 in `/tmp`-less form by `node scripts/pack-content-fix.mts --dry-run` after their person fixes are in.

## Refusals marked
no-find (a `find` on a known folder): right (1d533d45). once-only, twice (a real copy of `drift`): right (961116e3, 5a69691b). git-guard refused `git checkout` on an uncommitted tree, twice: right (it did what it said; I committed first); not marked because the main checkout's log did not list them as open.

## Decisions
- Pin by committed copy, not by a commit hash: the diff is in the file's own history.
- A file a person judges is left whole rather than half-fixed, to keep law 2 green.
- `test/pack-content-rig.mjs` is an untracked emitted file present before my work; I committed it once by mistake and removed it in the next commit.

DONE_WITH_CONCERNS: red was seen for the ratchet only; the other plants were written green. Report: docs/workorders/typescript/agents/w10-testfix-report.md (written in the agent's worktree, .claude/worktrees/w10-testfix)
