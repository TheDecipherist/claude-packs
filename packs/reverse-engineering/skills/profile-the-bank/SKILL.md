---
name: profile-the-bank
description: Use when a carved bank of patch records is about to have its offsets attributed, when a record stride or count is unknown, or when an attribution needs checking against the corpus.
---

# Profile the bank (one job: per-offset statistics of the patch corpus that every attribution must agree with)

Statistics give shape, never names. A profile of every offset tells which bytes are constant, which count, which are enums and which are bipolar, so an attribution that disagrees with it is wrong before it is written.

<constraints>
Always do:
1. Run `node .claude/tools/byte-profile.mjs <bank file> <record size> [--csv]`. For each offset it prints the distinct values, min, max, the most common value and its share. Keep the CSV beside the report.
2. Class each offset from the profile: constant, enum, bipolar around 64, or unipolar. Range-check every field over the whole bank before trusting an offset.
3. Compare offsets: repeated blocks show as similar distributions, a packed enum shows as a codebook, and a multi-field byte shows as a range that fits two ranges.
4. When the stride is unknown, profile at each candidate stride and phase: per-column entropy against a code baseline and a random baseline finds the record stride and count. The neighbour-difference profile finds the fast axis. Where the stride is unknown, read the autocorrelation at candidate record lengths, and check each extracted audio bank by one smoothness number (near 0.9 or more against near zero). Per-column entropy finds the stride and count, but every phase of the right stride scores alike, so the phase comes from the firmware; never rate an unpack by a "constant fields" score, which an out-of-phase unpack also earns.
5. Count the patches that use a parameter. Below about 40 using patches it cannot be attributed from the corpus.
6. Use a sibling's bulk dump as `[COR]` only for single-byte parameters below the offset where the two diverge. List the sibling's extra blocks from both manuals and set the stop offset before any agreement with the sibling is counted.
7. Treat an unnamed byte with a musical histogram, stored and then followed by a call, as a hidden parameter. A corpus statistic can settle an order (carriers sit near max output).
8. Before naming a byte column an algorithm or family index, read it with its neighbour as a 16-bit value and see whether it is one smooth ladder.

Never do:
- Name an offset from its profile alone.
- Attribute a parameter from fewer than about 40 using patches.
</constraints>
