---
# concepts: js
paths:
  - "placeholder"
---

# No source file over 300 lines

## The law
A file holds one module with one responsibility, and never more than 300 lines. Before a file reaches the limit, split it by responsibility (types, schema, helpers, the main logic) into a folder with an `index.ts` that re-exports. Never split it arbitrarily into part1 and part2.

(The downloaded templates allowed 800 lines; this house limit replaces that.)

## Check
```js
'max-lines': ['error', { max: 300, skipBlankLines: false, skipComments: false }],
```
The existing edit hook that refuses oversized files remains the hard stop.
