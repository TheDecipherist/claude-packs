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

# What cannot be reached is said, never clamped

<constraints>
Always do:
- Silence and count an out-of-range target.
- Grey what a destination cannot reach, and say why.
- Find the real control rate, not the timer period: a scheduler serving 16 voices in turn scales every envelope by 16.
- Read both signs of a law before linearising it, and suspect the fixed-point format when a constant lands near a real number.

Never do:
- Clamp in silence, or let an array bound thin a pattern.
</constraints>
