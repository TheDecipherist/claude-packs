---
# concepts: cpp, js, python, tooling
paths:
  - "placeholder"
---

# A waveform can be data, an oscillator or a generator; an octave can be locked or free

<constraints>
Always do:
- Decide what a waveform is: data read from a table, what the oscillator itself is, or a generator beside it. If two cannot coexist on the original, they are modes.
- Derive a locked sub from its parent's increment.
- Treat a free layer as a whole voice.
- Give a layer the original's filter and envelope arrangement: shared where the original shared them, separate where it separated them.
- Record, for each wave entry, how it was generated and how it behaves above Nyquist.
- Seed per slot, so two slots of one preset do not share a random stream.
- Apply the mode test: a selection that changes the number of oscillators, the port type or the sample rate is a mode, not a wave. A sample rate that is the pitch register is a mode.

Never do:
- Dedupe pitches in the allocator: two layers on one note is the sound.
</constraints>
