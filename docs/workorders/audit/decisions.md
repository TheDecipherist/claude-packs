# Decisions taken in the audit run

## d-1 Evidence under build/ is not committed {#d-1}
- Question: the order puts evidence in `build/evidence/W<n>/`, and `build/` is ignored by git.
- Options: force-add the evidence; move it to a tracked folder; keep it where the order names it.
- Chose: keep it where the order names it (local to this worktree), and put every result that matters (exit codes, counts, verdicts) into `progress.md`, `units.md` and the report, which are committed. Easiest to reverse: a later run can add the folder.

## d-2 Ids SORTED.md lists as DECIDED join the ledger {#d-2}
- Question: W0 sizes `units.md` from DECIDED.md and SORTED.md section 7, but U26 (C16), E2.8, E8.11, E11.3, E13.1, E19.5, E21.1, E21.6, E52.1, E53.1, E61.1, E74.1 and T6 are work the order names (W3 names U26) and are listed only in SORTED.md section 6 as DECIDED.
- Options: leave them out of the ledger; add them.
- Chose: add them, and L1, L2 (W2's two logs) and S1 (W6's shell text), so every piece of named work has a row. The counts of both sources are kept apart in the ledger's header.

## d-3 How a new skill's pressure test is run {#d-3}
- Question: `pressure-test-skill` asks for three baseline and three with-skill runs per skill; the order asks, per new skill, that it fires and is followed in its scenario and stays silent in a near miss. About sixty new skills.
- Options: six agent runs per skill (about 360 runs); a routing test plus a follow test, batched.
- Chose: per step, (1) routing: three Sonnet agents each get the skill listing a project with those packs would see (name and description, as Claude Code decides) and every new skill's must-fire situation and near miss, in three orders, and name the one skill they would load first; a skill passes at 2 of 3 fires and 2 of 3 silences; (2) following: Sonnet agents given the skill and its must-fire situation write their first actions and what they would avoid, scored by the lead against the skill's steps and Never list. Records in `build/evidence/W<n>/pressure/`. A skill that fails gets a sharper description first, then a hook, as the order says.

## d-4 Agents run their own tests; the lead runs test:changed after the merge {#d-4}
- Question: each agent's `test:changed` reaches about 120 test files (a new tool reaches the hook rig) and waits on the load governor; W1's agents could not finish it.
- Options: every agent runs test:changed; agents run the tests of the files they wrote plus the repo lint and counts tests, and the lead runs test:changed once on the merged step.
- Chose: the second. The merged result is the one that lands, so the lead's run on it is the gate; an agent still proves its own tests red first.
