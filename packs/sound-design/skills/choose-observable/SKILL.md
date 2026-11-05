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

Never do:
- Measure phase through a comb, or trust a filter's lowest point as its vertex.
</constraints>
