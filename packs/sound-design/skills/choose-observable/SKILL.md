---
name: choose-observable
description: Use when writing a probe, when a measurement is noisy, or when deciding what audio can prove a behaviour.
---

# Choose the observable (one job: measure the signal that can prove it)

<constraints>
Always do:
1. Check preconditions: renders bit-identical, start state checked, stale frames drained, the program found by name.
2. Take the best rung: a pure gain (exact), pulse width, a stereo difference with a hard zero, pitch through the phase null, a filter, a comb's energy.
3. On pitch, keep the depth tiny: the law is exponential, and the error accumulates.
4. On a sampler, take the median of consecutive gaps.
5. If it cannot see phase, say so. Assert the offset does not move, and log the open item.
6. Prove two controls that sound alike are two axes by two different measurements.
7. When signal and noise overlap in one quantity, measure another.
8. Map a two-axis or macro control by the local gradient first, then by a rendered sweep.
9. Measure after a transition, never across it. Use a falling-edge trigger, and choose the probe tone on purpose.
10. For a layer on a harmonic the note already has, measure a ratio and read the start state.
11. Never excite a stereo difference or a comb with noise that differs per channel: noise is independent per channel (the same noise fed to both channels shows a comb, so it is usable there). Use a correlated tone or an impulse.
12. Balance layers by K-weighted loudness read at each layer's own maximum, never by RMS: a different crest factor makes equal RMS unequal in loudness.

Never do:
- Measure phase through a comb, or trust a filter's lowest point as its vertex.
</constraints>
