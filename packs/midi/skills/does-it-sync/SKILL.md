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
7. Say which clock the manual means: the audio clock or the tempo clock. Never search for "clock": sweep the strings for `tempo|bpm|sync|midi clk` first, and read a `CMPA #$F8` as a range test until its branch is read.
8. Test for sync: a machine with tempo sync has a parameter in note values or a named tempo source. Three false positives: Sync as a modulation type, a BPM in a preset name, and "a reverb keeps time".
9. Record two facts: what the hardware did, and what our unit slaves.
10. Ask what the machine SENDS: an output jack, a DLY/CLK switch, a metronome. It is a setting of its own beside OFF, INT and EXT.
11. Find whether one switch serves every destination or each has its own, and what runs when no clock arrives.
12. Do it per revision. Count the TIME flags in a per-parameter census (envelopes stayed unsynced on one machine), count the note twins of each time, and count parameters in n/24.

Never do:
- Take the rate from the brand.
</constraints>
