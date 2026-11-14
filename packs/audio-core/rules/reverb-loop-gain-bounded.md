---
# concepts: dsp
paths:
  - "placeholder"
---

# Reverb feedback can never exceed unity gain

<constraints>
Always do:
- Make FDN mixing matrices orthogonal (unitary). Keep per-line gains below 1, computed from RT60 per line length: `g = 10^(−3 · L / (fs · T60))`. Damping filters have |H| ≤ 1 at every frequency.
- Keep allpass and lattice coefficients within [0, 0.9999999].
- Use mutually prime delay lengths, scaled by sample rate.
- Modulate tank delays slowly (around 1 Hz, quadrature LFOs) with small excursion. Dattorro's plate uses 16 samples at 29761 Hz, scaled to fs.
- Make freeze/infinite mode exactly unity gain with the unitary check, never "slightly above 1".

- Apply the same bound to any multi-path feedback (a delay network, a comb bank, a resonator pair): make the loop's total gain below 1 and report the scale used.
- Set decay per band from a target T60 per band with the same formula, so a low band can outlast a high one, and keep Dattorro's input diffusers as published.

Never do:
- Tune a "bigger" hall by raising feedback toward or past 1. Lengthen the lines or change the damping.
</constraints>

## Check
- Unit test: for random vectors x, the norm of M·x equals the norm of x to within 1e-6.
- At maximum decay, impulse-response energy in successive 100 ms windows must never rise after 200 ms.
- Measured RT60 within ±10% of the setting (house choice).
