# Agent sc-a, step W3, 9 items

| id | new or extend | pack and file | its one thing | proof |
|---|---|---|---|---|
| U26 | new | base: skills/workflow-bugs/SKILL.md | log a workflow fault before the fix, close it with cause, fix and catch | pressure test |
| U28 | new | synth-creator: hooks/fault-logged.mts (Stop, order 20, optIn) | send a turn back once when its reply admits a fault and no bug log entry was written | test/hooks/synth-creator/fault-logged.test.mts (selftest, worktree case, emitted verdict) |
| E30.1-4 | extend | synth-creator: rules/done-means-fresh-evidence.md | done rests on fresh evidence (E30.1 names `can-the-user-open-it`, no "export") | paths |
| E31.1-2 | extend | synth-creator: skills/build-through-the-queue | `***Not Run`; no live export job, delete the generated binary-data folder | pressure test |
| E32.1-3 | extend | synth-creator: rules/debug-by-measurement.md | a fault is found by measuring | paths |
| E33 | extend | synth-creator: rules/hooks-and-gates.md | wire a guard into every entry point | paths |
| E34 | extend | synth-creator: skills/build-step | check handoff paths exist | pressure test |
| E35 | extend | synth-creator: rules/chart-first.md | blast radius from the chart; compare as-built with design | paths |
| E36 | extend | synth-creator: rules/long-work-in-the-background.md | deadline on every browser or renderer shell-out | paths |

Choices: the hook reads log paths from `files.bugs` and `files.workflowBugs` of layout.json (defaults bugs.md, workflow-bugs.md); a log entry is any write to either file in the turn; a sentence with a planted/expected/red-first marker is never an admission; `stop_hook_active` ends the turn (never loops). Opt-in; also added to the opt-in list of test/integration/worktrees.test.mts.
To pass the conformance gate, build-step (existing) was brought to the whole set (title "(one job: ...)", constraints block, description under 200, no "you", no project name); the ratchet counts S3, S4, S7, S8 fell by one each (test/fixtures/pack-content-ratchet.json). E30's quote "binary you can open yet" became "the user can open" (R7).

## Pressure scenarios for workflow-bugs
1. Fire: a hook refused a plain `git add src/a.cpp` in a build; the agent is about to loosen the hook. It must open workflow-bugs.md, add WB-n with time and zone, fix, close with cause, fix and catch. A run that followed it: logs first, takes the next number, writes date time zone, leaves it open if only a rule was written, names the number in the report.
2. Near miss: the filter output of a synth is wrong at high resonance. That is a product bug for bugs.md and debug-by-measurement; the skill stays silent.

## Rules
Extensions only; the rules' `paths:` are unchanged.

## Faults
No hook refusals met. node_modules in the worktree is a symlink to the audit one: `npm run check` fails to write its tsbuildinfo there (TS5033), and gates 1 and 5 of repo-lint fail for that reason alone; `tsc --noEmit --incremental false` on both projects is clean.
