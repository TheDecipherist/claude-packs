---
# concepts: dsp
paths:
  - "placeholder"
---

# Modulated delays read with a proper interpolator

<constraints>
Always do:
- Read chorus, flanger, vibrato and modulated delay taps with cubic or Lagrange-3 interpolation, or better.
- Inside reverb tanks, allpass interpolation is allowed, since the pitch change there is tiny.
- Add the interpolator's own latency to the delay time. Signalsmith's figures: linear 0, cubic 1, Lagrange-n (n−1)/2.
- Size every delay line for its maximum time plus the interpolator's extra taps, at the highest sample rate, in `prepareToPlay`.

Never do:
- Read a moving tap with nearest-sample lookup (zipper noise).
- Use linear interpolation where its high-frequency loss matters: it adds time-varying low-pass filtering (Dattorro 1997, §1.3.7).
</constraints>

## Check
Delay a 10 kHz sine at 48 kHz by 10.5 samples. Linear interpolation loses about 2.0 dB; 4-point Lagrange or Catmull-Rom about 0.54 dB. Pass (house choice): ≤ 0.6 dB loss for chorus and flanger.
