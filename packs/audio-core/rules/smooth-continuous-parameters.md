---
# concepts: dsp, audio
paths:
  - "placeholder"
---

# Every continuous parameter is smoothed per sample

<constraints>
Always do:
- Give each continuous control (gain, cutoff, resonance, mix, pan, drive, matrix-driven values) a `juce::SmoothedValue` or an equivalent one-pole smoother.
- Call `reset(sampleRate, rampSeconds)` in `prepareToPlay()`, `setTargetValue()` once per block, and `getNextValue()` per sample.
- Use multiplicative smoothing (`ValueSmoothingTypes::Multiplicative`) for frequency and gain in dB, where linear ramps sound uneven.
- Call `setCurrentAndTargetValue()` when a patch loads, so a preset change doesn't sweep.

Never do:
- Apply a new parameter value as a step at the block boundary (zipper noise, clicks).
- Smooth stepped controls (waveform choice, on/off, octave). Crossfade those instead when switching causes a click.
</constraints>

## Check
Test: hold a sine, jump a parameter from minimum to maximum, and assert the largest sample-to-sample difference in the output stays under a set threshold.
