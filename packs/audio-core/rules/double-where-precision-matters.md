---
# concepts: dsp, world
paths:
  - "placeholder"
---

# Phase, sample rate and coefficients are computed in `double`

<constraints>
Always do:
- Keep the sample rate, phase accumulators, phase increments and tempo/clock positions in `double`.
- Compute filter coefficients in `double`. Store them as `float` only after they're normalised.
- Use a `double` accumulator (or pairwise summation) for RMS, energy, metering and any long running sum.

Never do:
- Declare `float sampleRate`, `float phase` or `float phaseInc`. Float phase drifts audibly over long notes and slow LFOs; sixteen clocks synced to tempo need the precision.
</constraints>

## Check
`.claude/checks/float-phase-or-rate.json` (lesson-checks hook) blocks new `float` declarations of sample rate, phase or phase increment.
