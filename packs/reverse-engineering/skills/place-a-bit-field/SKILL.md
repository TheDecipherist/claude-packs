---
name: place-a-bit-field
description: Use when a field's byte or bit position in a record is not settled by the documents, when two readings of a layout both look plausible, or when a field's width seems to change.
---

# Place a bit field by statistics a wrong place fails (one job: choose between positions with a stated margin)

<constraints>
Always do:
1. Score each candidate position against the corpus with tests a wrong place fails: the only all-zero run where documented spares sit; mutual information with "non-default"; an enum that reaches its printed maximum and no more; signed deltas that stay in range.
2. State a margin and take the winner only when it beats the runner-up by it.
3. Score an ambiguous rule against a physical invariant (zones cover 61 keys).
4. Look for flag bits inside value bytes (values clustered at 1 to 7 and 64 to 71) and for a field whose width changes with a flag.
5. Where two record lengths exist, brute-force the positions that drop out between them, and find boundaries from the corpus before the manual.
6. A width inferred from a maximum stays a guess until a loop counter or copy length agrees; choose between factorisations of a size by a measured period.

Never do:
- Take a position because it is the first that fits.
</constraints>
