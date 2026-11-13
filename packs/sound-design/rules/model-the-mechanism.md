---
# concepts: cpp, js, python, tooling
paths:
  - "placeholder"
---

# Model the machine's own mechanism, not a generic stand-in

A generic envelope or filter sounds like every synth and not like this one; the difference is what the machine is bought for.

<constraints>
Always do:
- Model an envelope in the shape the machine has: a pitch envelope that returns stays one that returns.
- Let artefacts come from the mechanism: a clocked switched-capacitor filter aliases because it is clocked, so model the clock.

Never do:
- Replace a mechanism with a generic stand-in because the stand-in is easier to tune.
</constraints>
