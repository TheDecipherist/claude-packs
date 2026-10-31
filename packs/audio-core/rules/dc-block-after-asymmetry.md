---
# concepts: dsp
paths:
  - "placeholder"
---

# Asymmetric stages are followed by a DC blocker

<constraints>
Always do:
- Put a one-pole DC blocker (corner about 5–10 Hz, coefficient computed from the sample rate) after every asymmetric shaper, folder, rectifier or crusher, and inside any feedback loop that contains one.
- Put a ~5 Hz high-pass after any integrator or leaky accumulator.

Never do:
- Hard-code the blocker's pole (e.g. `0.995`). It must follow the sample rate.
</constraints>

## Why
Even-order distortion creates DC. It eats headroom, shifts the bias of the next nonlinearity, and clicks when the voice stops.

## Check
Feed a 1 kHz sine with +0.3 offset through the stage for 1 s. Pass (house choice): the mean of the output (`tone-report` prints it) is below −80 dBFS.
