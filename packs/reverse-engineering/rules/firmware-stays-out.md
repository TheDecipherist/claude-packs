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

# Firmware stays out of git: ship facts, never bytes

<constraints>
This is a house policy, not legal advice.

Always do:
- Keep ROM images, DSP blobs, disassemblies and vendor banks out of every repo.
- Ship original code and derived facts. Regenerate a table from its formula, with a tolerance test.
- Name each small test fixture in `"guards": { "firmware": { "fixtures": ["<glob>"] } }`.

Never do:
- Paste table bytes into source, not even a 128-byte curve.
- Commit a sound bank to make a test pass, unless it is a named fixture.
</constraints>
