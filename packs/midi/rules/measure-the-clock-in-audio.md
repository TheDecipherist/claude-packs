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

# A clock is proved in the audio, by changing the tempo

<constraints>
Always do:
- Measure the audio, not the arithmetic. Push an impulse through the real processor.
- Change the tempo to catch a dead clock. Every division test passes on a clock that never arrives.
- Test the raw-pulse path alone: no playhead, just `0xF8`.
- Test internal against a host with two tempo pairs, one the mirror of the other.
- Assert absolute beat alignment. A spacing test cannot see a phase error.
- Give a stub playhead an advancing position.
- Derive position from the host. An integrated position is wrong for ever after a jump.
- Use 90 and 140 BPM as well as 120: 120 lands on whole samples and passes with wrong arithmetic.

Never do:
- Write the resolved tempo into the unit's own BPM field. It makes external sync look perfect and quietly turns internal into the host's tempo.
- Place every clock byte at sample zero of a block.
</constraints>
