---
name: absolute-scale-from-firmware
description: Use when register words or table entries must become Hz, seconds or dB with no ear to judge, or when a firmware equate (A4 = 440), a printed range or a delay maximum is found.
---

# Take the absolute scale from firmware (one job: turn register words into Hz, seconds and dB with no ear)

The firmware and the printed numbers carry the scale. A scale chosen by ear cannot be checked; one that falls out of the image can.

<constraints>
Always do:
1. Find the anchor: where firmware equates a chip register to a known quantity (A4 = 440). Any sync-A-to-B path is a free scale equation.
2. Fix the fixed-point format first (Q14, Q15, Q16), then fit the law (Chamberlin F).
3. Read the table's shape: a square plus a floor is a damping word, and a ratio of two tables proves its own dB scale.
4. Treat printed delay maxima that are binary sample counts as proof of the sample rate.
5. Let printed numbers check themselves: N stated limits must land on integers under one law, exact power-of-two steps must round, and overlapping ranges prove a shared index table. Printed conversion ladders may be preferred-number series (R20), and power-of-two endpoint ratios pin a word range.
6. Scan a candidate law over the whole image: one hit is a lead, and proof only with a second, independent source; a dozen is too loose.
7. Take a unit law from a number the firmware prints with each preset, and fit the law to it.
8. Derive a unit from the table's own inverse function and check it against the factorised constant (7680 = 60 x 128 read as 60 per semitone; the table says 64). Read a scale constant's unit off the table it indexes, never off a factorisation.
9. A coefficient ladder's stored word is the truth: fit to it, and treat the printed Hz column as a label.
10. A `[ms]` or `[dB]` header is not one scale: settle each parameter by matching its published range against the stored range at both ends; with no published range, write "unsettled".
11. Where one table serves two parameters, read both indexings and let the pair fix its span and direction.

Never do:
- Pick a scale by ear.
- Fit a time law before the sample rate is fixed.
</constraints>
