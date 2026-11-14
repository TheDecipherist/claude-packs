# fx-4 (W9) report: review/base-sc-templates.md

| # | result |
|---|---|
| 1 | fixed: trailing clause cut from generic.md W5 Done when |
| 2 | fixed: cpp rule now says iterators into a growing `unordered_map` (rehash invalidates iterators; pointers and references to elements stay valid until erase); vector and string keep the full list |
| 3 | fixed: the kit-itself parenthesis dropped from pdf-to-md step 3 |
| 4 | fixed: the `#` branch removed from the pattern (no globbed language uses `#` comments; adding py would make a bare `...` line, a valid Python stub, refuse) |
| 5 | fixed: measured on the kit, mongodb-operator and solera sources, 0 hits for every phrase; cut `same as above`, `similar to above`, `implement this` as ordinary comments; why text updated |
| 6 | fixed: commit-says-why points to the git rule for work-in-progress commits and states the atomic monorepo exception |
| 7 | fixed: "Where the reference is a rack unit" opens the aspect line |
| 8 | fixed: offer first, render on the user's yes (or when the order says so, unattended) |
| 9 | fixed: "Where a generator exists, wire ..." |
| 10 | fixed: `Stage 1` narrowed to `Stage 0\d` (Stage 01 furniture form); `Scroll down` kept (not measured on a web repo: none here) |
| 11 | fixed: "generation job"; `--asset` for a font or data file |
| 12 | fixed: text says the governor holds how many run at once |
| 13 | fixed: dispatch rule points to `agent-model` for Opus |
| 14 | fixed: "Where an as-built chart can be generated from the code" (no kit tool makes one) |
| 15 | fixed: pull lines merged, "TYPE number" and the budget clause dropped |
| 16 | fixed: kept in `a-gate-measures-the-real-thing`; done-means-fresh-evidence points to it |
| 17 | fixed: item 12 worded for any queue |
| 18 | fixed: items 9 and 11 merged (outranks for ink and legends, item 8 stands for position and proportions); item 1 opens the EXACT-model demand with "for a photo of hardware" |
| 19 | fixed: rule-log, skill-log and anchors-check rows moved to their alphabetical places, one onByDefault entry a line (the tests block was not sorted overall before; only the new rows were placed) |
| 20 | reviewer wrong: `test/pack-content.test.mts` R7 flags "perhaps" as a hedge (red with the original wording); d-5 records this reword as bringing the file up to the gate |
| 21 | fixed: blank line removed in new-project; "the folders the user keeps projects in" in start-from-a-workorder (it has no item 7; only new-project had the split) |
| 22 | fixed: Always line under `## Always`, "Also /build-step." restored (description 200 chars, the S8 limit) |
| 23 | fixed: blank line removed, "(for example A000..H127 or 80..99)" |
| 24 | fixed: split into two lines |

Tests run: pack-content, workorder (unit and integration), planner (unit and integration), counts, lesson-checks: green. `test/repo-lint.test.mts`: gates 1 and 5 fail with `(r.stdout + r.stderr).trim is not a function` under quiet-test (a harness fault in the test's spawn result, not from these edits); not investigated. `packs/manifest-2.0.0.json` regenerated locally, not committed (lead regenerates).
