---
# concepts: dsp
paths:
  - "placeholder"
---

# Multiband splits sum back flat, and dynamics detect in the log domain

<constraints>
Always do:
- Split bands with 4th-order Linkwitz-Riley crossovers (two cascaded 2nd-order Butterworth sections). With 3 bands, run the low band through the second split's allpass, so the bands sum back flat in magnitude and coherent in phase.
- Detect level in dB: peak or RMS (about 10 ms), with attack and release one-pole smoothing applied in the dB domain and a soft knee (Giannoulis, Massberg & Reiss, JAES 2012).
- Move crossover points with the same modulation-safe rules as filters, since crossover moons can be pushed.

Never do:
- Split bands with plain Butterworth or first-order filters whose sum isn't flat.
- Smooth gain in the linear domain (uneven attack and release across levels).
</constraints>

## Check
- Test: with zero gain in every band, the summed output is flat within ±0.01 dB from 20 Hz to 20 kHz.
- Test: sweep a crossover point 10 octaves per second. No clicks (no sample jump over the smoothing threshold) and no NaN.
