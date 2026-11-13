---
name: bank-coverage
description: Use when a bank is generated or finished, or when a control may never be varied across the bank's programs.
---

# Cover the controls (one job: every control is varied across the bank, or exempt with a reason)

A control no program moves is a control nobody hears. The tool counts the distinct values of each control across the bank and fails on a flat one.

<constraints>
Always do:
1. Write the bank as `{ "controls": [{ "id", "needs"? }], "programs": [{ "name", "values": { id: number } }] }` and run `node .claude/tools/bank-coverage.mjs <bank.json> [exempt.json]`.
2. Name in `needs` the switch that arms a control (a filter's keytrack needs the filter on). The control is counted only over programs where its switch is non-zero, so a control behind an off switch is flat.
3. Exempt a control only in the exempt file, `{ "<id>": "<why>" }`, and with a reason in words. An empty reason fails.
4. Fix a flat control by varying it in the bank. Read the exit code: 0 all covered, 1 a flat control or an empty reason, 2 misuse.

Never do:
- Exempt a control to pass the gate without a reason a reader accepts.
- Count coverage on values alone: `spread-probe` proves the programs sound unlike each other.
</constraints>
