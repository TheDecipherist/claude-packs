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

# A saved session is append-only: every old one still loads

<constraints>
Always do:
- Save a header and a prefix-compatible payload.
- Add fields at the end only, and assert padding.
- Test that a session from the last release loads.

Never do:
- Insert or retype a field: every saved session once loaded as defaults.
- Write a raw struct to a blob.
</constraints>
