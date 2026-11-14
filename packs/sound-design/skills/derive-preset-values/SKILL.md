---
name: derive-preset-values
description: Use when a bank's values are to be filled and the firmware may not hold them, when a decode shows 0 percent wet across a bank, or when values come from a manual's names and keywords.
---

# Derive preset values (one job: values for a bank the firmware does not hold)

A decode that is not credible is worse than none: it fills a whole bank with one wrong number. Say where each value came from, and keep the halves apart.

<constraints>
Always do:
1. Decode from the firmware first and use what decodes.
2. Drop a decode that is not credible (0 percent wet on a whole bank), per parameter, never kept. Gate it on a candidate offset.
3. With no firmware values, take the manual's keywords for a range, let the preset's name pick a reproducible point inside it, and tag the value `[PUB]` (a published source, here the manual), marked as manual-derived, never `[EAR]`, which is the author's listening.
4. Write in `laws.md` which half of the bank is decoded and which is derived.

Never do:
- Keep an implausible decode because it is what the bytes say.
- Pick a point by chance: the same name gives the same value on every run.
</constraints>
