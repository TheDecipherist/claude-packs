---
# concepts: audio, dsp, tests
paths:
  - "placeholder"
---

# An effects unit can be heard with no DAW: it carries its own audition source

An effect that only runs inside a host cannot be listened to in a standalone build or checked by a person who has no host open.

<constraints>
Always do:
- Give the unit a built-in source it can be fed from: a click, a drum loop and a held chord.
- Keep test signals for measuring: an additive one, a periodic one and a ramped one, each with a click probe at zero.
- Route the source through the same path as host input, so what is heard is what is rendered.

Never do:
- Ship an effect whose only input is the host.
- Audition through a path the plugin never uses in a host.
</constraints>
