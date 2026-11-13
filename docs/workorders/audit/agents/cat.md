# cat (W6, items N3, N4)

| id | new or extend | pack and file | its one thing | proof |
|---|---|---|---|---|
| N3 | new | reverse-engineering `skills/file-into-the-catalog/SKILL.md` | file each recovered oscillator, filter, envelope, LFO and effect into the user's catalog per its SCHEMA.md, then gen_all and drift_check; catalog path is layout.json `catalog`, none named: say so and stop | pressure test |
| N4 | new | reverse-engineering `hooks/catalog-entry-exists.mts` (opt-in), rule `rules/catalog-entry-exists.md` | refuse a write to build.md that newly ticks a step tagged `module: <category>/<entry>` whose `.md` or `.h` is missing from the catalog | `test/hooks/reverse-engineering/catalog-entry-exists.test.mts`, selftest, worktree case |

Marker chosen: `module: <category>/<entry>` (entry = path under the category, no extension). Only newly ticked, tagged lines are judged; no catalog named passes. Both `.md` and `.h` are required; an unrecovered effect stays unticked (skill step 5).

Tests changed to carry the opt-in hook: `test/worktree-cases-packs.mts` (enable + update) and the `enable` list in `test/integration/worktrees.test.mts`.

Ratchet: no count asked for; pack-content passes whole (22 of 22).

## Pressure scenarios (skill)
1. Fire: a run has recovered the Synthex's filter (3320, four modes as pole-tap sums) and its build.md step is about to be ticked; layout.json has `catalog: "~/projects/synthcatalog"`. A run that followed it would: read filters/SCHEMA.md and module.h; write elka/synthex.md and .h; run gen_all.sh then drift_check.py; write `module: filters/elka/synthex` on the step; tick it.
2. Near miss: the run is asked to find the filter coefficient table in the ROM (`find-a-table`). The skill stays silent: nothing is finished or filed yet.

## Rule
catalog-entry-exists.md loads with its hook (`# hook:`), no `paths:`.

## Faults
None. Early red tests were the opt-in hook not installed and a type error, both mine. Selftest row 1 is the plant (no entry, refused) and the same step passes once the entry is written.
