---
name: categorise-a-factory-bank
description: Use when a decoded factory bank has no categories of its own, when its programs must be filed as Pad, Bass, Lead and so on, or when a bank's Other share is large.
---

# Categorise a factory bank (one job: every decoded program in one category, and the Other share printed)

A bank decoded from a machine arrives as numbered programs. A category list written first and fitted afterwards files a third of the bank under `Other`. The machine's own names and bytes say more than a guess does.

<constraints>
Always do:
1. Read the category list from the machine: its category byte, its menu, or the words its names end in. Freeze it, with `Other` last.
2. File by name first, on the last token of the name (`Warm Pad` is a Pad, `Pad Warm` is read by its last word, `Warm`, and falls through).
3. For what the name did not file, use the machine's category byte, if the format has one.
4. For what is still unfiled, use the patch's shape: envelope times, filter movement, pitch range, the oscillators it uses. Write each shape test as data, one row per category.
5. Print the count in each category and the share in `Other`, every run. Read a sample of `Other` by eye and add the words or shapes it shows.
6. Keep the result as data beside the bank, with the pass that filed each program (name, byte, shape), so a wrong filing is traced to its pass.

Never do:
- File by the first word of a name, or let a later pass overwrite an earlier one.
- Grow the category list to shrink `Other`: the list is the machine's.
- Call the bank filed with `Other` as the largest category.
</constraints>
