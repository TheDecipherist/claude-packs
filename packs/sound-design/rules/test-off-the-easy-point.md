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

# Test where a wrong answer cannot pass

<constraints>
Always do:
- Vary the thing the error lives in, all the way down: low, middle and high notes; the tempo, not the division; two points for "A follows B"; phase apart from rate.
- Take expected values from the printed source, not the code.
- Trace where a term acts: velocity on depth is not velocity on output.
- Excite what you test. A click hid 100x of preset difference.
- Use two anchors to fix a law: one fits any curve.

Never do:
- Use one point that is zero exactly where everyone auditions: `note - 60` passes at middle C.
- Compare a function with itself.
- Invent a term. It is worse than a missing one.
</constraints>

## Check
Lesson checks for this rule: `no-literal-key-anchor`, `test-compares-a-function-with-itself`.
