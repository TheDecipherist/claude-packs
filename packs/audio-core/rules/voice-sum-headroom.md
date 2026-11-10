---
# concepts: audio
paths:
  - "placeholder"
---

# 96 voices summed can never clip the output stage

<constraints>
Always do:
- Scale per-voice output for the full voice count. 96 uncorrelated voices sum about +19.8 dB above one voice (√96); phase-reset, same-note voices can sum up to +39.6 dB.
- Keep the gain staging before any post-sum nonlinearity independent of the number of voices playing, so the effects see the same level for one note or a chord.
- End the signal chain with a soft clipper or limiter at a fixed ceiling, never hard clipping or wraparound.

Never do:
- Normalise by the *current* number of active voices (pumping as notes start and stop).
</constraints>

## Check
Test: 96 voices, same note, phase reset, maximum resonance. Pass (house choice): the peak before the limiter is ≤ +6 dBFS and the output never exceeds the limiter ceiling.
