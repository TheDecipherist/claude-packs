---
name: find-a-table
description: Use when a table of values (a curve, a rate list, a pointer array, a tuning table) must be located in a firmware image and only its values, its shape or its size are known.
---

# Find a table by its values or its shape (one job: locate it, then confirm it in code)

A table is found by what it holds, then proven by the code that reads it. A scan only proposes: a run that looks like a table in initialised data can be code, or chance.

<constraints>
Always do:
1. Search a run of known values (the consecutive maxima, a stated value as a needle) at every stride and width. A stated value that matches exactly one window in the image is a strong lead; many windows is noise.
2. Take first differences before fitting a law: piecewise steps refuse one formula, so fit each piece.
3. Look for pointer arrays into a string region, and back-pointer descriptors. The pointer table may sit far from its data: search for pointers INTO the region.
4. In erased space, look for shapes (a run of 2^n times a count) and for a deliberately coarse low end.
5. Treat rows that are one shape times multipliers as one table with a multiplier column.
6. Confirm every candidate in code: find the routine that loads the base and adds the stride. A run in initialised data needs evidence that does not depend on its position before it is called a table.
7. Name what was scanned (`a-negative-names-what-was-scanned`) and write the table's address with its space (`addresses-name-their-space`). The shapes are in `table-shapes.md`.
8. On a segmented image, derive each segment register from the reset path, vector writes and `cs:` overrides, and repeat the table search under each before writing "absent".
9. Check a candidate pointer table for a constant step before calling it pointers: a table stepping by a constant 0x372 was a ramp read at the wrong phase.

Never do:
- Call a structural scan's hit a table before the code that reads it is found.
- Fit one formula across a curve whose first differences step.
</constraints>
