---
# concepts: dsp, audio
paths:
  - "placeholder"
---

# A shared oscillator, filter or control interface refuses a mismatch

A shared interface that accepts any number lets a machine word pass for a frequency: a mode flag in a frequency word, a sample increment where hertz were meant, a divisor-quantised pitch, control data on an audio port. Each of them sounded wrong only after it was wired.

<constraints>
Always do:
- Design the interface by trying the cases that break it: a mode flag in a frequency word, a sample increment, divisor-quantised pitch, control data on an audio port.
- Make each mismatch a compile error: give frequency, increment, control and audio their own types, so a machine word cannot stand where a frequency is expected.
- Let a named adapter say how to convert one into the other, so the conversion is deliberate and found by search.

Never do:
- Accept a bare float or integer where a typed value is meant, or convert silently inside the interface.
</constraints>
