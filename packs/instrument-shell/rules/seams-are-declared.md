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

# The seams of a shared shell are declared, and proved

<constraints>
Always do:
- Keep tab and division indexes append-only.
- Prove an opt-out with a byte-identical render.
- Build both sides of a seam together.
- Prefix every test, target and output with the unit's name, so a family of units can build as one.
- Take a copy of shared code only with a proof: every line traced to its source, what was cut listed, and a bit-for-bit comparison.

Never do:
- Change the shared shell for one unit.
- Let a connection that type-checks mean different things at each end.
</constraints>
