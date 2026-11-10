---
# concepts: dsp, world
paths:
  - "placeholder"
---

# Math functions are only ever given values inside their domain

<constraints>
Always do:
- `sqrt(std::max(0.0, x))`, `std::log(std::max(x, tiny))`, `acos` and `asin` on `std::clamp(x, -1, 1)`, and `x / d` only when `|d| > eps`, with a defined result otherwise.
- Handle the 0/0 cases explicitly: `sinc(0) = 1`, limiter or compressor gain after silence, RMS of an empty window.

Never do:
- Feed a parameter-derived value straight into `log`, `sqrt`, `pow` with a negative base, or a division.
</constraints>

## Check
Test: sweep every parameter to its extremes (cutoff 1 Hz and Nyquist − 1, gain +24 dB, resonance max, time 0) with silence, full-scale noise, a 1 Hz sine and a Nyquist-rate sine as input. Pass: all output finite.
