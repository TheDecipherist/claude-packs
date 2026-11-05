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

# A waveform can be data, an oscillator or a generator; an octave can be locked or free

<constraints>
Always do:
- Decide what a waveform is: data read from a table, what the oscillator itself is, or a generator beside it. If two cannot coexist on the original, they are modes.
- Derive a locked sub from its parent's increment.
- Treat a free layer as a whole voice.

Never do:
- Dedupe pitches in the allocator: two layers on one note is the sound.
</constraints>
