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

# MIDI clock is a pulse stream with no channel and no tempo message

No byte says "120 BPM". The tempo is the rate the pulses arrive at. The full law is beside the `clock-probe` skill, in `clock-law.md`.

<constraints>
Always do:
- Handle real-time bytes (`0xF8` and above) before any channel test. They have no channel.
- Expect real-time bytes inside any message, a SysEx dump included.
- Count only `0xF8` as a pulse. `0xFE` is active sensing, and it arrives constantly.
- Write divisions in ticks at 192 per quarter: a 1/64 is one and a half MIDI clocks.
- Keep the division list append-only, since a unit stores the index. Sort a copy for the menu.

Never do:
- Read a "sync channel" setting as a channel: it is usually a port or a device id.
- Believe a factor of two at once. Suspect the meter first, then a duplicate clock or a pre-MIDI rate, then the divisions.
- Assume a rate from a brand. Read the machine's manual, and its jack: a pulse count and a step trigger need different models.
</constraints>

## Check
Lesson checks for this rule: `active-sensing-no-pulse`, `midi-realtime-first`, `sysex-survives-realtime`.
