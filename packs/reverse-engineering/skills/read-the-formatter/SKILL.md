---
name: read-the-formatter
description: Use when a parameter's unit, range or curve must be chosen, a display routine is found, or a manual screenshot shows a value to match.
---

# Read the formatter (one job: take each unit and curve from the routine that prints it)

<constraints>
Always do:
1. Read each display routine against the manual's screenshots before choosing a curve: the routines are the laws.
2. List everything a formatter can print before using a screenshot value.
3. Take the decimals from the display template; a record byte often restates them.
4. For a symbol-valued parameter (a note length, a division), compute the run its meaning forces at the PPQN and search for it.
5. Test each candidate unit against the preset names that imply a magnitude (a 3D FLANGER storing 10 can only be 0.1 ms steps).
6. Find the record grid before reading a separator at a fixed offset; let a stored cursor column or scale byte point at the value (a fixed-offset scan lost 56% of a table).
7. State which way each rate or level table runs and prove it with one musical fact (LFO rate rises with the value; envelope and LFO may read one ladder in opposite directions) before naming it.

Never do:
- Choose a curve from one screenshot value.
</constraints>
