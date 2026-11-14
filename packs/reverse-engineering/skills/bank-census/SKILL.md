---
name: bank-census
description: Use when a law seems wrong, when presets sound alike or too dark, or before calling a filter or level law finished.
---

# Take a census of the bank (one job: see where a value settles across every program)

<constraints>
Always do:
1. Render the whole factory bank, and record the value in question for every program.
2. Print the median, p10, p90, the share pinned at floor and ceiling, and the unclamped span; a range check that comes out negative is not a second source. Read the distribution, at rest and at peak together: a patch dark at rest can open wide. Bunched dark at both, or pinned bright, means a term is missing or invented.
3. If it is clean, count the programs that set each byte: a term that is zero at rest leaves no trace.
4. Flag any program 40 dB under its neighbours.
   Count per filter mode: a cutoff resting below 400 Hz is dark only in a low-pass, and wide open in a high-pass.
5. Compare with what the machine's own bank was voiced for.
6. Run it again after any replaced `[EAR]` constant: a correct Q of 496 put 176 of 769 programs over full scale.
7. A column with one value in every patch is either a wrong decode or fixed structure: decide by the code that reads it.
8. Keep per-feature corpus counts ("190 patches use ring or noise mix-mods") as regression tests: a decode change that moves them is wrong.
9. Write each corpus count as `byte[n] == code (manual label): count of total`, and check its polarity against the manual's own table.

Never do:
- Run this on your own starter bank. It proves nothing.
</constraints>
