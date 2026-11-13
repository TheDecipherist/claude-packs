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

## d-5 Where E28 goes, and what a touched file must pass {#d-5}
- Question: the conformance gate (test/pack-content.test.mts) holds every new or changed pack file to the whole set. `unattended-runs.md` has no frontmatter (R1); giving it `# concepts:` or `# hook:` would change when it loads, which is a change to how the kit works. E28 was written into it.
- Options: change its loading; keep E28 there and leave the gate red; put E28 in the base rule about logs.
- Chose: E28 goes into `plan-and-logs.md` ("Log it when several units fit different constants to one shared law, and fix the law once, with every unit's measurements"), `unattended-runs.md` is left as it was, and its missing frontmatter goes to the user (FOR THE USER). Other touched files were brought up to the set without a change of meaning: a `paths: placeholder` line in the reverse-engineering rules (paths are generated at install), `## Check` sections naming the checks that already point at a rule, nine skill descriptions cut under 200 characters, two "you" lines reworded, and a project's name taken out of `subagent-dispatch.md`'s example. The ratchet's counts fell (R1 83 to 75, R6 21 to 18, R7 21 to 20, S7 11 to 10).

## d-6 The three usage logs are on by default, in new and existing projects {#d-6}
- Question: skill-log, rule-log (W2's L1, L2) and agent-ledger (U74) are new base hooks. A new hook never switches on silently in an existing project, but these refuse nothing.
- Options: opt-in; on for new installs only; base's `onByDefault`, so `update` brings them too.
- Chose: `onByDefault` for all three. They only record, and the user's reason for them ("the only way we can ever truly track which skills/hooks/rules are actually being triggered") needs every project's numbers. agent-model, a new refusal, stays opt-in.

## d-7 The midi rules' concepts when the conformance gate makes them declare some {#d-7}
- Question: five midi rules loaded by raw globs (`**/*.cpp`, `**/*.py`, `**/*.ts`, ...). Extending them makes the conformance gate (R1) require `# concepts:`; `cpp, js` would drop Python files.
- Options: `cpp, js`; `cpp, js, python, tooling`; leave the extensions out.
- Chose: `cpp, js, python, tooling`. Python files are covered where the python pack is installed and in tool folders; a project with loose Python scripts outside both and no python pack loses the rule there. Noted for the user.
