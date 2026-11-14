---
name: measure-reverb
description: Use when measuring or calibrating a reverb or a decay time.
---

# Measure a reverb (one job: a decay time to trust)

<constraints>
Always do:
1. Mute dry and early reflections, and zero the pre-delay.
2. Use Schroeder T30, or a least-squares fit of the tail.
3. Measure over a long enough render for the longest setting.
4. Read the law in the units its procedure uses.
5. Compare with the printed figure.
6. Measure echo density and the comb peak beside T60: a reverb of the right length can be the wrong sound. Define echo density as the share against Gaussian noise of the same length over 60 to 460 ms (bad at 0.20 to 0.33, wash near 1.0) and the comb peak as the strongest autocorrelation after 1 ms (bad above about 0.3).
7. Return unusable when the decay fit is poor, never a number.
8. Keep a listen-list of the six faults the green metrics miss, and play it. Name the six faults with their gates: first arrival under about 2 ms at under about 30% of the peak, slapback read from output taps at the line ends, modulation only inside the recirculation and never in the output taps, half the lines modulated alternately, line lengths spread, and a size range of at least 2:1.
9. Name the topology of the reference first. A per-band T60 asks for a longer low decay, and bands are multipliers of the mid time.
10. Point the window at where the claimed difference lives, and keep a reference page of the published structures.
11. Validate the decay meter on a synthetic exponential of known time before trusting it, and compare every reverb with its published figure on every build. A short shared decay setter self-calibrates at prepare.

Never do:
- Read a time off the peak level.
- Inherit a sibling machine's law: reverb times were once 20 to 45% short that way.
</constraints>
