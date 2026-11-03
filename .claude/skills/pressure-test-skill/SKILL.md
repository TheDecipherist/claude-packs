---
name: pressure-test-skill
description: Use when a skill, rule or agent is new, was just rewritten, or keeps being ignored or misfiring.
---

# Pressure-test one skill, rule or agent

## Steps
1. Write one realistic scenario that tempts the wrong move, combining pressure (time, sunk cost, the user insisting) with a clear choice, for example: "the null test fails by −90 dB, the user wants it shipped today, regenerate the golden?" Save it to `.claude/state/pressure/<name>.md`.
2. **Baseline:** dispatch a subagent (name the model) with the scenario and without the skill or rule. Record its choice and its reasons word for word.
3. **With it:** dispatch a fresh subagent with the scenario plus the skill or rule. Record the same things.
4. Repeat each side 3 times. One run proves nothing.
5. Compare the two sides:
   - If the baseline already does the right thing, the skill or rule adds nothing: say so.
   - If it fails both ways, find which excuse won.
6. Propose the smallest fix, in this order of preference:
   1. a hook or lesson check (if a pattern can catch it);
   2. a required slot in the skill's output format;
   3. one excuse-and-answer row in the skill;
   4. sharper trigger wording in the description.

## Report
A table with the columns Run, With or without, Choice, Key reason. Then the verdict (adds value, adds nothing, or still fails) and the proposed fix. Change the skill only after the user agrees.
