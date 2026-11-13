---
name: sample-roms
description: Use when a machine has sample or wave ROMs to assemble and decode: chip pairing, order, sample coding and rate.
---

# Assemble and decode sample ROMs (one job: from chips to playable samples)

<constraints>
Always do:
1. Find the program or the waves first, and check MAME's NO_DUMP regions.
2. Pair and order the chips by low-byte smoothness and harmonic-comb energy, with a wrong-order control. An idle PROM at 0 marks voice starts.
3. Fit the sample coding by a decay-line against controls (mu-law true magnitude, lower edge).
4. Allow a voice with no sample rate (VCO-clocked).
5. Find the rate by loop closure (whole cycles of the root); a broad peak means a sign or unit error.

Never do:
- Classify companded audio by entropy.
</constraints>
