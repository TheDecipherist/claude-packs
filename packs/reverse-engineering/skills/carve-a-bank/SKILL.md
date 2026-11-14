---
name: carve-a-bank
description: Use when factory banks are to be cut out of a flash or ROM image whose record layout is known or guessed, before any bank count is stated.
---

# Carve a bank (one job: factory banks cut out of a flash image by record validity)

A bank is a run of valid records, not a pair of offsets. The count of banks is a fact to settle from the manual before the image is cut.

<constraints>
Always do:
1. Settle the bank counts from the manual first: banks A and B may hold copies of C and D.
2. Carve by record validity: every byte under 128 and the name at a fixed offset, and keep the run's start, length and the records it holds.
3. Check the first carved name against an independent reader, such as the emulator's default patch.
4. Suspect any reading that needs a skipped slot, and recheck the stride.

Never do:
- Carve at offsets fitted to two records.
- State a bank count the manual does not support.
</constraints>
