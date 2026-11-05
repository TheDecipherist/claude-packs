---
# concepts: dsp
paths:
  - "placeholder"
---

# Oscillator edges are band-limited

<constraints>
Always do:
- Correct every discontinuity (saw reset, pulse edge, hard-sync reset, and each of a supersaw's stacked saws) with a band-limiting method: PolyBLEP at minimum; 4th-order B-spline polyBLEP, minBLEP or mipmapped wavetables for the top octaves.
- Keep the phase accumulator and its increment in `double`.
- It depends on what is being built. On an original design, the default stays clean. On a reproduction (`guards.instrument.kind`), the machine is the spec: a naive saw is the instrument, with its source cited and a golden-file test.

Never do:
- Write a naive `phase * 2 - 1` saw or `phase < pw` pulse straight to the output.
</constraints>

## Why
Välimäki, Pekonen & Nam (JASA 2012) measured how far up each method stays alias-free at 44.1 kHz: 2nd-order PolyBLEP to about 2.1 kHz fundamental, 4th-order Lagrange to about 5.1 kHz, 4th-order B-spline to about 7.8 kHz. Above that, a better method or oversampling is needed.

## Check
Render 2 s of the oscillator at 48 kHz with f0 = 110, 1000, 2000 and 4186 Hz, then run `node .claude/tools/tone-report.mjs <wav> <f0>`. Pass (thresholds are a house choice): the largest non-harmonic peak is below −60 dB re the fundamental up to 2 kHz, and below −40 dB at 4186 Hz.
