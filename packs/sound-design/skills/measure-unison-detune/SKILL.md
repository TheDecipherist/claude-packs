---
name: measure-unison-detune
description: Use when the detune of a unison or super saw stack is to be read from a render or a recording, or when a fitted detune comes out as zero.
---

# Measure a detune stack (one job: the detune of a unison read from its partials)

A stack's saws sit close in pitch, so their harmonics form clusters. The detune is in how the clusters spread, and only some harmonics show it.

<constraints>
Always do:
1. Take f0 by autocorrelation, never from a spectral peak.
2. Read only the harmonics where the clusters have not merged: at a high harmonic the outer saws are wide in Hz.
3. Make every predicted partial claim its own peak, or the fit collapses to d = 0.
4. Measure each partial against the cluster's own centre partial, so the note's tuning cancels. Set the offsets measured, not assumed.
5. Take no reading from an MP3's top octave.
6. Prove the fit on a planted stack of known detune before trusting a reading.

Never do:
- Read the detune from the width of one peak.
- Fit partials that two saws share.
</constraints>
