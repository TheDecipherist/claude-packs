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

- Run every continuous control through the project's one smoothing module, the path and namespace named in `.claude/layout.json` `guards.smoothing`, so a search for the namespace shows what is smoothed and what is not. A control that does not run through it is a fault.
- Keep a census: every continuous control with the smoother it runs through, generated from the parameter table, with a control that has none red.

Never do:
- Smooth by hand anywhere but the module: no `juce::SmoothedValue`, no `x += k * (target - x)`, no `exp (-1 / (seconds * rate))` coefficient. A line that is not parameter smoothing (a compressor's ballistics, a one-pole audio filter) ends with `// smooth-ok: <reason>`; the reason is required.
- Apply a new parameter value as a step at the block boundary (zipper noise, clicks).
- Smooth stepped controls (waveform choice, on/off, octave). Crossfade those instead when switching causes a click.
</constraints>

## Check
- **Hook (blocks the edit):** `.claude/hooks/realtime-guard.mjs`, when `.claude/layout.json` has `guards.smoothing` (`{ "module": "src/dsp/smooth/**", "namespace": "smooth", "scope": ["src/audio/**", "src/dsp/**", "src/engines/**"] }`; without it the check is off). In the scope and outside the module it refuses an added `SmoothedValue`, a one-pole slew written out, a slew coefficient built from `exp (-... / (seconds * rate))`, `applyGainRamp`, and a gain that is not a numeric literal applied to a whole block (`applyGain (volume * level)`, `FloatVectorOperations::multiply (p, gain, n)`, `addFrom (..., gain)`), which steps at every block boundary (KWB-126). A literal gain and a `// smooth-ok: <reason>` line pass. Only lines the edit adds are judged.
- **Gate (the project keeps it):** jump each continuous control, or each control kind (one per template, `prove-instances-identical`), from minimum to maximum while a tone sounds, and assert the largest sample-to-sample step stays under a stated threshold. It has a planted twin, with smoothing removed, that must go red.
- **Census (the project keeps it):** every continuous control and the smoother it runs through; a control with none is red.
