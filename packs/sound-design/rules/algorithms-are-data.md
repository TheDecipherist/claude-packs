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

# A machine's algorithm list is real only if each one is the right kind of effect

<constraints>
Always do:
- Make each algorithm a block graph, as data, run by one loop.
- Prove the kind by measuring: a delay delays, a comb combs, a filtered delay is filtered.
- Report spread per algorithm and across the bank, as medians, over 8 seconds or more, with log-spaced frames.
- Use the machine's own numbers: its stage count, its interval, its delay memory.

Never do:
- Pass a table test as proof. One unit had 15 algorithms on 1 DSP path, and another had 13 of 23 that were a wire.
- Build a family of effects on a single generic engine and call the list done.
</constraints>
