---
# concepts: cpp, js, python, tooling
paths:
  - "placeholder"
---

# A counter-clocked oscillator's pitch is an integer divisor, and the model rounds it

A machine whose oscillator counts clock ticks per cycle has no drift and a coarse pitch step near the top: about 0.0023 semitone at C4 and 0.145 near 16 kHz. A float phase increment hides that step, and a bank tuned against the machine drifts from it exactly where the step is largest.

<constraints>
Always do:
- Ask of each oscillator whether it is a counter. If it is, derive its pitch from an integer divisor and round the divisor the way the machine does.
- Test the rounding at the top of the range, where the step is widest, and at one low note, where it is not.
- Take the range from the machine's own divisor table; where it shifts the table index per octave, model the shift.

Never do:
- Add drift or a float increment to a counter oscillator to make it sound alive.
- Test it at middle C alone: the step is under 3 cents there.
</constraints>
