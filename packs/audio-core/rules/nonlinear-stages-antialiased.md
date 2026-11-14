---
# concepts: dsp
paths:
  - "placeholder"
---

# Nonlinear stages are antialiased, except deliberate crushers

<constraints>
Always do:
- Give every static nonlinearity (drive, tanh, clipper, wavefolder, HEAT-style saturation) first-order ADAA, `(F(x[n]) − F(x[n−1])) / (x[n] − x[n−1])` with antiderivative F chosen so F(0) = 0, plus at least 2x oversampling. Use more oversampling where measurement says so.
- Handle the ill-conditioned case: when `|x[n] − x[n−1]| < eps`, use `f((x[n] + x[n−1]) / 2)`.
- Oversample only the nonlinear "island", not the whole chain. Pick the smallest factor the measurement allows: host rate, then 2x, then 4x, then 8x only with evidence.
- Use ADAA only on memoryless curves (tanh, soft clip, folder). Stages with memory (envelopes, feedback) need oversampling instead.
- Count ADAA's half-sample delay in the latency of that path. Inside a filter feedback loop, absorb it structurally (Parker, Zavalishin & Le Bivic, DAFx-16 §6.1). Never drop ADAA into a loop as-is.
- Align a parallel layer's latency with the dry path when a stage runs oversampled beside it, so the two sum in phase.
- Treat bit reduction and sample-rate reduction (FireBloom's BITS, the BIT effect) as *intended* aliasing: run them at host rate without oversampling, feed them an already band-limited signal, and follow them with a DC blocker.
- Measure kernel length at 8, 16 and 32 taps before choosing it: it buys passband and not alias rejection. Keep oversampling of a bilinear-warped filter off by default, bit-identical when off, since it is not transparent.

Never do:
- Run a hard clipper or folder at the base rate with no ADAA or oversampling.
</constraints>

## Why
In DAFx-16 Table 1, a hard clipper at gain 10 needs 12x oversampling alone to reach about 46.7 dB SNR; first-order ADAA gets there at about 4x.

## Check
- `tone-report` on sine probes at 1, 3, 5 and 7 kHz (plus 10 kHz at 96 kHz) through the stage at gain 10. A 1 kHz probe alone hides aliasing. Pass (house choice): SNR ≥ 45 dB at every probe.
- Unit test: constant input, and x[n] == x[n−1], give finite output equal to f(x) within 1e−6.
- Crushers: golden-file test per sample rate, and full resolution at rate 1 returns the input unchanged.
