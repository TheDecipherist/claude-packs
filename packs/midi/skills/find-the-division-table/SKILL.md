---
name: find-the-division-table
description: Use when a machine's note divisions (1/4, 1/8T, dotted) must be found in its firmware or read from its manual, and put in the right order.
---

# Find the division table (one job: a machine's note divisions, in the right order)

An index permutation of a division list is in range, round-trips and passes the corpus, and locks to the wrong division. Order is the whole difficulty.

<constraints>
Always do:
1. Establish the machine's PPQN first.
2. Search the firmware by arithmetic. The table is stored once, as small tick integers at that PPQN (at 24 PPQN, `6 8 9 12`). Search for the run of integers it implies, not for strings: a display draws a note value as a bitmap.
3. Treat the per-destination tables as the check on that table, not as its source.
4. Read a two-column division list in a manual row by row, never column by column. Take the order from the appendix, where the list is printed again on one line, before the page that shows it as a table.
5. Prove the order: sorted by duration the list ascends.
6. Prove the note values by exact ratios to the stored tempo (stored time over a quarter at the preset's tempo gives 1, 0.75, 0.5, 0.333, 0.25) and mark each rung the bank never uses as interpolated.

Never do:
- Order a division list from a display, a column or memory.
- Call a rung measured when only its neighbours were.
</constraints>
