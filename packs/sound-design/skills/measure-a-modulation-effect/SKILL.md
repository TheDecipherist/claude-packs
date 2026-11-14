---
name: measure-a-modulation-effect
description: Use when the delay, the modulation or the width of a chorus, flanger, phaser or ensemble is to be read from its audio, or when such an effect is compared with a recording.
---

# Measure a modulation effect (one job: delay, modulation and width from the audio)

A modulated delay leaves a comb on the spectrum. Its spacing is the delay, its movement is the modulation, and the two channels disagreeing is the width.

<constraints>
Always do:
1. Read the delay as the peak of the autocorrelation of the power spectrum (the comb spacing).
2. Read the modulation as that peak moving over time.
3. Read the width as the two channels disagreeing.
4. Excite it with a source correlated across channels, never noise that differs per channel (`choose-observable`).
5. Prove the probe on a planted known delay before trusting a reading.

Never do:
- Read a delay from a single notch.
- Trust a probe that was never shown a delay it could get wrong.
</constraints>
