---
paths:
  - "**/*.cpp"
  - "**/*.cc"
  - "**/*.h"
  - "**/*.hpp"
  - "**/*.mm"
  - "**/*.py"
  - "**/*.ts"
  - "**/*.js"
  - "**/*.mjs"
---

# A control at its neutral computes exactly nothing

<constraints>
Always do:
- Make a control at its documented neutral compute exactly 1.0, or exactly 0.
- Make 0% wet come out dry, never silent: a mix is a crossfade.
- Start blank programs at neutral. A modulation byte of 0 can mean full negative depth.
- Fail on a blank extraction row: clamping it to zero rendered 66 presets silent.

Never do:
- Leave a default that colours every preset: this is how a bank ends up "all sounding the same".
- Hash a value into the signal path to make voices differ.
</constraints>
