---
# concepts: dsp
paths:
  - "placeholder"
---

# Modulated filters stay stable and accurate under audio-rate modulation

<constraints>
Always do:
- Use a structure that stays stable under fast modulation for any filter the matrix, envelopes or LFOs can move: a trapezoidal (TPT/ZDF) SVF or ladder. Morph LP > BP > HP > notch by interpolating the *output mix* of one structure.
- Prewarp: `g = tan(π · fc / fs)`. Clamp `fc ≤ 0.49 · fs` before the `tan`.
- Recompute coefficients per sample when the cutoff is modulated (a fast `tan` approximation is fine if its error is ≤ 0.1% up to 0.45 · fs).
- Clamp resonance to its documented self-oscillation range. Give any zero-delay-feedback solver a fixed maximum iteration count and a fallback to the last estimate.

- Count anything a push, comet, note or thread can move as modulated. That includes Stellix's floor EQ handles (spec 7.2), which comets and notes bend by formula, so the EQ needs a modulation-safe structure (e.g. Cytomic SVF bell and shelf responses), not static biquads.

Never do:
- Use direct-form biquads for modulated filters. They're fine for static EQ only.
- Change filter type by switching or crossfading between different filter structures.
</constraints>

## Why
Cytomic's trapezoidal SVF stays stable and smooth when cutoff, Q and mix move at audio rate. In float32 its error on a 20 Hz bell is about −111 dB, against about −59 dB for a direct-form biquad (Cytomic, "SVF vs DF1"). Direct-form coefficients are most sensitive at low cutoff, where the poles crowd near z = 1.

## Check
- Sweep the cutoff 20 Hz ↔ 18 kHz with a 2 kHz sine LFO at maximum resonance for 10 s. Pass: every sample finite, peak ≤ +24 dBFS (house choice).
- Set fc = 0.4 · fs and measure the peak or −3 dB frequency. Pass: within ±1%. Passing fc = fs/2 and fc = 2 · fs gives finite coefficients.
- If an existing proven filter (such as Solera's) passes these, it stays as it is. The tests are the law, not a particular structure.
