---
# concepts: cpp, shaders, python, go, rust, js
paths:
  - "src/**/*.cpp"
  - "src/**/*.h"
  - "src/**/*.hpp"
  - "src/**/*.mm"
  - "tests/**/*.cpp"
  - "tests/**/*.h"
  - "packs/**/*.cpp"
  - "packs/**/*.h"
  - "src/**/*.{js,mjs,cjs,jsx,ts,tsx}"
  - "tests/**/*.{js,mjs,cjs,ts,tsx}"
  - "test/**/*.{js,mjs,cjs,ts,tsx}"
---

# A comment goes at the end of its line, after the code, never in the middle of it

A `//` put in the middle of a line swallows every statement after it, and the file still compiles.

<constraints>
Always do:
- Put a trailing comment after the last statement of its line.
- Put a note about the next statement on a line of its own, above it.

Never do:
- Put `//` before code on the same line, so that a statement after it becomes part of the comment.
</constraints>

## Check
`no-code-after-midline-comment` refuses an edit that adds a line with code after a mid-line `//`.
