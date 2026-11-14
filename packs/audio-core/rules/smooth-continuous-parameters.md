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

- Run every continuous control through the project's one smoothing module: a folder named `smooth` (`src/dsp/smooth/`, namespace `smooth::`), or the path and namespace `.claude/layout.json` `guards.smoothing` names, so a search for the namespace shows what is smoothed and what is not. A control that does not run through it is a fault. Smoothing is never optional: there is no setting that switches it off.
- Crossfade every switch that changes what is heard, over a few milliseconds, through one helper in the same module: bypass, an on/off, a mode, a type, a routing, an oversampling rate, a source choice. A bypass done in one sample clicks.
- Slew a synced or base delay time per sample (about 60 ms), the recirculating path first, so a tempo or time change glides; snap it after a reset, so a loaded patch does not sweep.
- Remove a meter reconfiguration click by subtraction: the settled value minus the value that has arrived, applied mid-leg, never a restart.
- Keep a census: every continuous control with the smoother it runs through, generated from the parameter table, with a control that has none red.
- Build the reconfiguration-artefact meter on a periodic input, so the settled and arrived runs align for the subtraction; bound the artefact's amplitude and not its duration; test mid-leg of a crossfade and not only the printed detents; and prove cells that always run state-identical.

Never do:
- Smooth by hand anywhere but the module: no `juce::SmoothedValue`, no `x += k * (target - x)`, no `exp (-1 / (seconds * rate))` coefficient. A line that is not parameter smoothing (a compressor's ballistics, a one-pole audio filter) ends with `// smooth-ok: <reason>`; the reason is required.
- Apply a new parameter value as a step at the block boundary (zipper noise, clicks).
- Smooth stepped controls (waveform choice, on/off, octave) with a ramp: crossfade them, as above.
</constraints>

## Check
- **Hook (blocks the edit), always on:** `.claude/hooks/realtime-guard.mjs`. The module is any folder named `smooth` and the project's copy trees, the scope the project's `audio` and `dsp` concepts (else `src/audio`, `src/dsp`, `src/engines`, `src/app`); `.claude/layout.json` `guards.smoothing` (`{ "module": ..., "namespace": ..., "scope": [...] }`) can only name them more exactly, never switch the check off (1.7.2; KWB-145: it was off unless the key was set, and nothing set it). In the scope and outside the module it refuses an added `SmoothedValue`, a one-pole slew written out, a slew coefficient built from `exp (-... / (seconds * rate))`, `applyGainRamp`, and a gain that is not a numeric literal applied to a whole block (`applyGain (volume * level)`, `FloatVectorOperations::multiply (p, gain, n)`, `addFrom (..., gain)`), which steps at every block boundary (KWB-126), and a bypass branch done in one sample (`if (bypassed)`, `if (! isBypassed())`; 1.7.2). A literal gain and a `// smooth-ok: <reason>` line pass. Only lines the edit adds are judged.
- **Gate (the project keeps it):** jump each control, continuous and stepped, bypass included, or each control kind (one per template, `prove-instances-identical`), from minimum to maximum while a tone sounds, and assert the largest sample-to-sample step stays under a stated threshold. It has a planted twin, with smoothing removed, that must go red.
- **Census (the project keeps it):** every continuous control and the smoother it runs through; a control with none is red.
