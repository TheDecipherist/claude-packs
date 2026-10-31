---
# concepts: audio
paths:
  - "placeholder"
---

# Every note-on owes a note-off: one ledger tracks them all

<constraints>
Always do:
- Keep one note ledger with a state per voice: held, sustained, sostenuto, releasing. Every note started by anyone (keys, DOUBLE/TRIPLE extras, arp, HARMONY answers, BEATS) is entered in it.
- Sustain (CC64 ≥ 64 down): a note-off while the pedal is down marks the note sustained, and pedal-up releases it. Sostenuto (CC66) latches only the notes down at the moment it's pressed.
- Flush the ledger (release every voice) on CC123 all-notes-off, CC120 all-sound-off, transport stop, `releaseResources`, patch load, reset and bypass.
- Use JUCE's `MPEInstrument` only as the parser and note tracker for MPE; keep the house 96-voice allocator. Smooth per-note pressure and slide (about 5 ms one-pole per note).

Never do:
- Start a note anywhere without going through the ledger.
- Let a generated note (arp, harmony, double) outlive the key or event that started it without a scheduled note-off.
</constraints>

## Check
Fuzz test: random streams of notes, CC64/CC66, CC120/CC123 and patch loads. At the end, every voice is idle and the ledger is empty. With MPE input, each voice's pressure follows only its own channel.
