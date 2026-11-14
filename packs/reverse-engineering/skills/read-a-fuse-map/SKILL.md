---
name: read-a-fuse-map
description: Use when a PAL or GAL fuse map (a JEDEC file) is in hand and the logic it holds is to be read, before any equation is written.
---

# Read a fuse map (one job: recover the logic from a JEDEC map)

A JEDEC map is a grid of fuses. The equations come from the grid's shape and the part's own column-to-pin map, and a guessed pin map gives a fluent wrong equation.

<constraints>
Always do:
1. Read the part's grid from its datasheet: a map of 64 rows by 32 columns holds 8 rows per output, and each row is a product term.
2. Read an all-zero enable row as the output being an input (the pin is not driven).
3. Take the column-to-pin map from the datasheet. When it is not held, stop and record a gap naming the part and the sheet; write no equation.
4. Write each output as a sum of its product terms, and check it against the board's use of the pin (the chip it selects, the signal it gates).

Never do:
- Assume a column-to-pin map from another part.
- Write an equation for an output whose enable row was not read.
</constraints>
