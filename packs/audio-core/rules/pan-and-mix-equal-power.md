---
# concepts: dsp, ui
paths:
  - "placeholder"
---

# On an original, pan and dry/wet are equal power

A linear pan dips the middle by 3 dB. A reproduction keeps the machine's own pan (`reproduction-or-original`); this is for our own designs.

<constraints>
Always do:
- Make centre read 0.7071 each side, L^2+R^2 = 1 everywhere, in pan and in dry/wet.

Never do:
- Use a linear pan or mix on an original design.
</constraints>
