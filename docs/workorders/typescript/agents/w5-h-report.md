# W5 share h: no test file over 60 s

Branch `work/2.0.0-ts-w5-h`. `npm run build` and `npm run check` exit 0; `test/repo-lint-suite.test.mts` green (3 of 3; no `init` site added by any split).
Every file below was run alone with `node --import ./test/fresh-tmp.mts --test <file>`, one run at a time, green. Seconds are this machine's wall
seconds at load 3 to 9 (`uptime` beside each in the run log); the suite log's seconds ran about 2 to 2.5 times these (6 files at once). The file
list was run in one sequence, so loads were 3 to 9.

## Choices taken (unattended)

- Cheaper first, where the subject allowed: `keepHooks(dir, also?)` appended to `test/kit-cli.mts` cuts a copied install's `.claude/hooks` to ten quick hooks
  (plus those named), so the tests whose subject is doctor's selftests (the cache, a failing selftest, `--fresh`) prove them on 10 hooks, not 30 to 46
  (a full doctor: 28 s, ten hooks: 8 s). Used by doctor-cache, house-doctor-selftest and protect-vendor KF-2. Settings and the lock are left as they were; doctor stays green on it.
- `house-doctor`: `strict()` was called twice in one assert (as the message argument), so a doctor ran twice; now once.
- Otherwise split by subject into parts under about 50 suite seconds. Shared set-up went into `*-rig.mts` beside the tests (house-rig precedent),
  never copied (`once-only` refused three writes where the old copy was still in the source file; each marked right, and the original was rewritten first).
- A test that was one body over many doctors/Chrome pages was split into tests of the same subject (renames listed below); no assertion was dropped.

## Files: before (suite s) -> parts, local s after

| File | Before | After (parts, local s) |
| --- | --- | --- |
| integration/doctor-cache | 313 | doctor-cache 40, doctor-cache-failing 30 (rig: doctor-cache-rig) |
| integration/configurations | 182 | configurations 23, -python-rust 18, -synth-cpp 18, -node-fullstack 19 (rig) |
| hooks/base/base-pack | 170 | base-pack 18, -doctor 23, -updates 23, -laws 23 |
| hooks/lesson-cases.mts | 160 | a helper: its tests count in the 21 `lesson-checks` files that call it, each under 60 s; left alone |
| hooks/writing/writing-configurations | 157 | writing-configurations 18, -fullstack-go 18, -node-python 18, -rust-synth 18 (rig) |
| hooks/base/shape-law | 145 | shape-law 38, -install 14, -doctor 18, -doctor-lists 23 (rig) |
| integration/install | 145 | install 25, -update 23, -existing 24 (rig) |
| integration/house-doctor | 121 | house-doctor 14, house-doctor-selftest 27 |
| hooks/base/base-install | 120 | base-install 19, -kit 18, -token 18 |
| hooks/gpu-painter/gpu-painter-pack | 118 | gpu-painter-pack 14, -hover 27, -declined 27 (rig) |
| integration/install-block | 118 | install-block 19, -rebuild 9, -plugin 25 (rig) |
| integration/rule-tests | 109 | rule-tests 19, -pointers 23, -new 19 (rig) |
| integration/house-hooks | 104 | house-hooks 14, house-hooks-selftests 29 |
| hooks/base/other-projects | 104 | other-projects 18, -m-z 21, -update-all 19 (rig) |
| integration/kf-new-projects-doctor | 103 | kf-new-projects-doctor 18, -queue 18, -strict 18 |
| integration/workorder-check | 101 | workorder-check 31, workorder-check-more 27 (rig) |
| integration/configs | 92 | configs 33, configs-layout 18 |
| integration/custom-packs | 85 | custom-packs 20, custom-packs-update 24 (rig) |
| integration/house-update | 84 | house-update 19, house-update-rule 19 |
| hooks/ui-craft/page-measure | 83 | page-measure 33, -type 17, -spacing 17 (rig) |
| integration/hook-proof | 82 | hook-proof 15, hook-proof-crashes 22 |
| integration/house-entries | 68 | house-entries 14, house-entries-hand 10 |
| integration/rules-follow-the-code | 68 | rules-follow-the-code 22, -update 13 (rig) |
| hooks/base/lesson-checks | 67 | lesson-checks 18, lesson-checks-articles 14 |
| hooks/base/run-hooks | 66 | run-hooks 15, run-hooks-crashes 26 |
| hooks/synth-creator/protect-vendor | 65 | protect-vendor 29 (KF-2 doctor on ten hooks) |
| integration/house-git | 62 | house-git 11, house-git-copy-tree 14 |

The first file of each part pays for any install fixture it builds (once per run, `fixture(name)`); that cost is in the seconds above.

## Renamed tests (old -> new, file)

- writing-configurations: `every configuration brings the pack; nothing of it is named in the lock, and doctor --strict passes` -> `<config>: the configuration brings the pack; nothing of it is named in the lock, and doctor --strict passes` (8, one per configuration, over the four files); the `INSTALLS` key check became `every configuration has an install here, so each is proved by one of the writing-configurations files`.
- other-projects: `no hook of this project blocks an edit in another project` -> `... (hooks a to l)` and `... (hooks m to z)` (other-projects, other-projects-m-z).
- house-update: `update takes over a file that is the pack's own version instead of writing .pack-new again` -> `update takes over a hook that is ...`, `update takes over a rule that is ...` (house-update-rule), `a file the lock does not know, already identical to the pack's, is tracked from now on` (house-update-rule).
- house-hooks: `the house hooks install where they belong, project-neutral, and pass their selftests` -> `the house hooks install where they belong, project-neutral` and `the house hooks pass their selftests` (house-hooks-selftests).
- kf-new-projects-doctor: `KF-1: doctor is red when the queue is gone, and for a wrapper that queues nothing` -> `KF-1: doctor is red for a wrapper that queues nothing` and `KF-1: a wrapper that says it queues elsewhere is not red, and doctor is red when the queue is gone` (-queue).
- gpu-painter-pack: `doctor: UI code and no hover gate is a PROBLEM; the gate named (and its file there) is OK; a fresh project with no UI code is not` -> `doctor: UI code and no hover gate is a PROBLEM; the gate named (and its file there) is OK` (-hover) and `doctor: a declined hover gate needs its reason, and a fresh project with no UI code is not a PROBLEM` (-declined).
- page-measure: `page-measure in real Chrome: a sound page passes, and each planted fault is named` -> `... a sound page passes, and the heading and width faults are named` (page-measure), `... tiny type and text hidden at rest are named` (-type), `... unequal page margins and a heading over two lines are named` (-spacing).
- Added (no old name gone): shape-law-doctor-lists `doctor reads "values" and "names" as lists (KWB-10, KWB-12), and says nothing of a manifest that keeps the contract` (the second half of `doctor fails a synth with no manifest, ...`, whose name stays on the first half).
- Names kept as they were: every other test, in the file it moved to (see the table for where).

## d-12 replaced set

None touched.

## init sites

Unchanged: each moved `init` moved with its test (the configurations loop and install-block's `initFrom` each keep one site, now in a rig).

## Refusals

Three `once-only` refusals (ids 5e9c5565, d4c1fbac, 1c61c597) on writing a split file while the old copy stood in its source: marked right. One more open refusal in the log (a `git stash` by another agent) is not mine.

## Concerns

- The sums were measured here at load 3 to 9 and one file at a time, not by the lead's whole-suite log; a file whose suite seconds ran 2.5 times mine would be: doctor-cache 100, shape-law 95, page-measure 80, configs 80 (they are the nearest the line; the lead's run will say). If one is over, the next cut is by test (each is already a separate test).
- `lesson-cases.mts` (160) left alone as a helper whose tests are counted in its callers.

DONE_WITH_CONCERNS
