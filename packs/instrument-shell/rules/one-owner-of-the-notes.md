---
# concepts: audio, ui
paths:
  - "placeholder"
---

# One owner holds the notes: exclusion between note sources lives in the state

When the keyboard, MIDI, an arpeggiator and a sequencer can all play, and each decides for itself whether to yield, they sound together or cut one another off.

<constraints>
Always do:
- Keep one note owner in the shared state, naming which source may play now.
- Make every source ask that state, and release its held notes when it loses the claim.

Never do:
- Let each source check the others in its own code.
- Hand a source the notes with another still sounding.
</constraints>
