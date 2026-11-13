---
name: find-the-reset
description: Use when a rebuild's engine is to load patches, when a recalled patch carries state from the one before it (a held LFO phase, a stuck glide, an old modulation route), or before an engine's reset-before-apply is written.
---

# Find the reset (one job: map exactly what the machine sets before a patch loads, and in what order)

A patch is not the whole state a sound starts from. The machine clears or presets some state before it applies a record (envelopes to idle, LFO phases, glide sources, routes not in the record, the arpeggiator's position) and leaves the rest alone. An engine that applies a patch over whatever the last one left sounds different from the machine on every recall. This map is what the engine's reset copies, entry for entry.

<constraints>
Always do:
1. Find both resets: the power-on path from the reset vector (`identify-the-cpu` gave it), and the routine a patch load calls before it unpacks the record (the program-change handler, the bank-load path, the edit-buffer recall). They are usually different routines; map each.
2. List every write each one makes, in order: the target (with its address and space, `addresses-name-their-space`), the value or the source of the value (a constant, a table, the INIT template, a global setting), and what the target is (the engine field it becomes). A loop that clears a block is one entry with its range.
3. List what each leaves untouched that a patch could change: that is carried state, and the engine must carry exactly the same. Global settings (tuning, MIDI channel, velocity curve) are usually here.
4. Read the order where it matters: a value written by the reset and then overwritten by the record is the record's; a value written after the record unpacks (a forced envelope restart, a route cleared after load) beats the record.
5. Prove the map where you can run the code: in the house interpreter or an emulator run as a program, load patch A then patch B, and load B from a fresh reset; the two states must differ only in what the map says is carried. Tag the map `[FW]` with the routine's address, `[EMU]` for what the run confirmed.
6. Write the map where the engine's reset reads it (one table: target, value or source, order, power-on or patch-load), and name in it every field of the running record it does not touch.

Never do:
- Write an engine's reset from what seems sensible ("clear everything", "keep everything"): copy the map.
- Take the INIT patch as the reset: INIT is a record the reset loads (`find-the-init-patch`), and the reset also touches state no record holds.
- Map only the power-on path: the patch-load path is the one heard on every recall.
</constraints>
