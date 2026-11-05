---
# concepts: cpp
---

# Time and keys come from synthcore: one clock, written once

<constraints>
Always do:
- Link `synthcore` for tempo, MIDI clock, transport, sync modes, QWERTY and the focus rule. Subclass `core::CoreHost`, and make `host.readTransport (getPlayHead(), midi, n);` the first line of `processBlock`.
- Have every tempo-synced thing read the one master clock. Tap tempo sets the same `bpm` parameter the clock reads.
- Fix a fault in the clock in `synthcore`, once, with its test, and take it in everywhere.

Never do:
- Read the play head, count MIDI clock bytes or work out a tempo in a unit. `timing-from-synthcore` refuses it.
- Copy `synthcore`'s code into a unit, or write a second clock because one thing needs it.
</constraints>
