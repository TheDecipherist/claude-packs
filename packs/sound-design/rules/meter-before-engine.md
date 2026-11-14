---
# concepts: engine-source, tests
paths:
  - "placeholder"
---

# Suspect the meter before the engine, and make the render repeat

<constraints>
Always do:
- Make a probe's first assertion that the render reproduces. Reset every phase, ramp and seed on prepare, in its own commit.
- Read a constant ratio or an exact multiple as a meter fault first. Fix it, re-fit what was tuned against it, and grep for the same code.
- Assert against an absolute expected value. A meter wrong by a steady percentage passes every comparison of measurements.
- Flush between programs, and silence earlier voices.
- Use an RMS window longer than the oscillator's period, and RMS over whole periods for a rate.
- Fix an autocorrelation period by taking the smallest lag within 90% of the best peak, and count to the last peak, not the first.
- After a meter fault, re-fit everything that was tuned against it.
- Prove a decoded menu by moving one value and watching the audio move.
- Grep the engine for `static` and `thread_local` state, which a second render or a second instance shares.
- Give every measuring script a self-test with a known answer, and print the count per source: a zero count from a source that has data is a fault.
- When a constant's comment justifies it against a level, convert both to one unit in the test and assert the margin the comment claims (15 dB down is 17 percent, not "well clear of 2 percent").
- Measure a period on a clamped or tremolo waveform with a Schmitt trigger on the falling edge: peak-picking reports the guard width.
- Set a probe's lowest detectable frequency below the machine's lowest note (16.35 Hz for 16' plus sub), and test it on the lowest note alone: a high floor reports the key's pitch without an error.

Never do:
- Believe a factor of two: filter resonance puts two level peaks in every LFO cycle.
- Leave a meter bug in place because it flatters the score.
</constraints>

## Check
`audio-seed-fixed` refuses an unseeded random source in audio code, which makes two renders differ.
