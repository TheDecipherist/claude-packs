---
# concepts: js
paths:
  - "src/**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}"
  - "tests/**/*.{js,mjs,cjs,ts,tsx,mts,cts}"
  - "test/**/*.{js,mjs,cjs,ts,tsx,mts,cts}"
---

# No source file over 300 lines

A file holds one module with one responsibility. The limit is the house limit; the edit hook that refuses an oversized file is the hard stop.

<constraints>
Always do:
- Keep every source file at 300 lines or fewer.
- Split a file by responsibility (types, schema, helpers, the main logic) into a folder with an `index.ts` that re-exports, before it reaches the limit.

Never do:
- Split a file arbitrarily into part1 and part2.
</constraints>

## Check
The file-size hook refuses an edit past the limit (see `split-before-the-limit`). Where the project has ESLint: `max-lines` at 300, blank lines and comments counted.
