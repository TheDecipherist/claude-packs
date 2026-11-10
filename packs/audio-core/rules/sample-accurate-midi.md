---
# concepts: audio
paths:
  - "placeholder"
---

# MIDI events land on their exact sample

<constraints>
Always do:
- Render the block in segments split at each MIDI event's `samplePosition`: render up to the event, apply it, continue. (`juce::Synthesiser::renderNextBlock` does this; a custom voice manager must do the same.)
- Apply note-on, note-off, pitch bend, mod wheel, aftertouch and CC at their offset, not at the block start.

- Generate MIDI (arp, WaveArp, matrix notes) into a member `MidiBuffer` pre-sized with `ensureSize()` in `prepareToPlay`, then `swapWith` the host buffer.

Never do:
- Add to a `MidiBuffer` while iterating over it.
- Loop over the `MidiBuffer` first and then render the whole block. Every note then snaps to the block start, so timing jitter grows with buffer size and arps or matrix retriggers drift.
</constraints>

## Check
Test: send a note-on at sample offset 100 in a 512-sample block, and assert the first non-zero output sample is at index 100 (± the voice's known attack latency). Repeat at block sizes 64 and 2048.
