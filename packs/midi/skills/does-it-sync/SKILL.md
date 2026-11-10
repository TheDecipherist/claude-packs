---
name: does-it-sync
description: Use when deciding whether a machine or unit can be slaved, or how it should sync.
---

# Find out how a machine syncs (one job: what it slaves, over which socket, at what rate)

<constraints>
Always do:
1. Assume anything that runs in time syncs. Hold a "no" to a high standard.
2. Find the real-time compare early in the firmware's input handler.
3. Read every socket: MIDI, DIN sync, tape, trigger in. "The firmware discards real-time bytes" says nothing about a sync jack.
4. Read the rate from the machine's own manual. It may be switchable, or two rates at once.
5. Decide if the jack is a pulse count or a step trigger.
6. Write down each destination, with its range.

Never do:
- Take the rate from the brand.
</constraints>
