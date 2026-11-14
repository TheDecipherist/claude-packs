---
# concepts: cpp, js, python, tooling
paths:
  - "placeholder"
---

# An arpeggiator's semantics are read from the machine, never assumed

An arp and chord engine looks the same across machines and differs in what its gate, its rests and its latch do. The machine's arp is remade exactly, so none of these is a default.

<constraints>
Always do:
- Read from the machine, and write in `laws.md`, what its gate means (note length or step), what gate 0 with velocity 0 does (a rest), what MUTE, KEY SYNC and LATCH do to clock and phase, and where the first step fires.
- Prove the first step fires at the key's own sample.
- Probe latency from note-on to -60 dB through the full path.

Never do:
- Assume a gate, a rest or a latch behaves as another machine's does.
</constraints>
