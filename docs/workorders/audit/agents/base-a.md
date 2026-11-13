# base-a, W2

| id | new or extend | pack and file | its one thing | proof |
|---|---|---|---|---|
| U22 | new | base `rules/a-gate-measures-the-real-thing.md` | a gate opens, names and counts what it measures | paths: loads where concepts plan, notes apply |
| U23 | new | base `rules/debt-gates-fail-on-rise.md` | a debt-count gate keeps a floor, fails on a rise | paths |
| U24 | new | base `checks/no-elided-code.json` + `rules/no-elided-code.md` | refuse elided source | bad caught, good passes; 0 hits over packs, lib, scripts, bin, proxy, test (measured with the pattern in Python); spreads never fire; no `py` glob, because a bare `...` is valid Python |
| U25 | new | base `rules/second-time-is-a-tool.md` | second hand-done run becomes a tool or skill | paths |
| E22.1, E22.2 | extend | `rules/git-right-first-time.md` | fetch before ahead/behind; commit unfinished at once (E22.3 dropped) | paths |
| E23.1-3 | extend | `rules/subagent-dispatch.md` | model tiers, partition by file, baselines, estimate, queue | paths |
| E24.1, E24.2 | extend | `skills/new-project` | latest-versions first; never copy another project's folder | pressure test |
| E25 | extend + tool | `rules/references-use-anchors.md`, `tools/anchors-check.mts` | duplicate anchor fails; cross-project resolves when present, warning when absent | `test/tools/base/anchors-check.test.mts` (5 tests); plant removed (duplicates forced empty) went red (1 fail), restored green |
| E26.1-3 | extend | `rules/plan-and-logs.md` | dated entries, count once, re-check stale blocker | paths |
| E27 | extend | `skills/add-lesson-check` | pointer to existing `"code": true` | pressure test |
| E28 | extend | `rules/unattended-runs.md` | one shared law fixed once | paths |
| E80 | extend | `skills/land-branch` | list trunk paths the branch also touched | pressure test |
| E29 | extend | `skills/write-a-workorder` | rank a multi-machine queue (step 12) | pressure test |

New rules load where concepts `plan, notes` apply (U22, U23, U24 rule, U25): they are about gates, logs and process; a rule with no frontmatter fails R1.

## Faults
- No hook refusal on my work (one stray `git checkout -p` in a command was refused by git-guard, rightly; nothing ran).
- `test/pack-content.test.mts` "new or changed file" still red on two files I extended: `rules/subagent-dispatch.md` R7 (names Stellix, existing line) and `rules/unattended-runs.md` R1 (no frontmatter, loads everywhere on purpose). Both pre-exist; I did not reword them. The ratchet's R1/S7/S8 counts are over by other packs' files (reverse-engineering), not base-a's.
- `Verdict` clashed with a shared type name (repo-lint); the tool's type is `AnchorVerdict`.
- The pack's tool test key was added to `packs/base/pack.json`.
