---
name: measure-a-filter
description: Use when a filter's corner, slope or resonance is to be fitted or checked from renders of an emulator, a recording or the rebuild.
---

# Measure a filter (one job: corner, slope and resonance from renders)

A filter read off one render is read off the source's own spectrum as much as the filter's. Divide the source out, and a corner, a slope and a Q are numbers a gate can hold.

<constraints>
Always do:
1. Render the wide-open filter first, the same note and level as each closed render, and divide every closed render by it harmonic by harmonic. Skip the fundamental.
2. Take the open reference from a render where the filter really is open. Check the cutoff it was given is below the engine's clamp: a clamped maximum is still a filter.
3. Subtract the source's own tilt only where no open reference was divided out in step 1 (a render read on its own). A saw's band energy falls 3 dB per octave; leave it in and every slope reads 3 dB per octave steeper.
4. Measure the excitation's spectrum before trusting it as flat. A synth's noise is not white.
5. Use three excitations, each for what it shows: a saw for the corner, noise for the slope and the mode, self-oscillation for the tuning. Fit the whole curve, not one point (`measure-a-law`).
6. Read a resonance as a Q, never as a level. A row the excitation cannot resolve (a peak between two harmonics) is NOT MEASURED; report the model-free peak height beside it.
7. Use the corner the engine resolved (read it from the running engine or the render), not the one the knob names.
8. Measure at the level the voices drive the filter at, not at a convenient quiet level.
9. For a stereo, chorus or comb measurement, use an excitation correlated across channels: a synth's noise is independent per channel.
10. Before measuring one block, list every block in the path and neutralise each: a routing value named after its pole count is not a bypass (a Ser4 routing keeps filter 2 in the path). Print that isolation set with the result.
11. For a noise mode, divide by one flat reference in place of the step 1 open render, not each mode's own wide-open render (a saw divides by its own open render, step 1). A saw reads the noise floor deep (a one-pole reads steeper than a three-pole). Fit the corner and the passband gain together.
12. Ask whether the cutoff register is absolute or relative to the oscillator's pitch (keyfollow is then relative too), and settle it with a key-tracking sweep.
13. Measure drive's level change at resonance 0 and in the passband, put any make-up outside the loop, and let the stability sweep, not taste, set its number. A limiter with no make-up is a compressor.
14. When a filter order is added, solve its own loop crossing, sweep stability over every corner and shape, and measure a highpass skirt one octave under the corner, where float cancellation cannot hide it.

Never do:
- Read a slope from a saw's raw spectrum, or a corner from a single harmonic.
- Report a Q for a row the render could not resolve.
</constraints>
