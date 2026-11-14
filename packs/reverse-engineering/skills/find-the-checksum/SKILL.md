---
name: find-the-checksum
description: Use when a disk, tape or container carries a check value whose algorithm is unknown, before any record is called valid or any check is guessed.
---

# Find the checksum (one job: name an unknown check by a grid search that verifies every record)

A check that fits one record fits by chance. It is named only when it verifies every track or record.

<constraints>
Always do:
1. Search the grid: polynomial, reflection, initial value, final xor and endianness, over one record first.
2. Take bit order and framing from the I/O chip in the parts list (`boards-from-photos`, `read-a-circuit-diagram`): the controller fixes them.
3. Accept a candidate only when it verifies every track or record, n of n, then inspect the odd and last records.
4. Record the winning parameters, the count verified and the chip that implies them.

Never do:
- Accept a check that verifies a few records.
- Keep a candidate the controller chip's bit order rules out.
</constraints>
