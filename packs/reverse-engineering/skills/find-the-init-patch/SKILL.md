---
name: find-the-init-patch
description: Use when a rebuild needs its INIT (initial, default, basic) patch, when the manual names a key combination that loads one, or before a new-patch default is written for a reproduction.
---

# Find the INIT patch (one job: the machine's own INIT record, and the keys that load it)

A reproduction's new patch is the machine's INIT, value for value, not a neutral patch of ours. The record usually sits in the firmware as a packed template, and the machine loads it from a key combination the manual mentions in passing. Both are read from the machine.

<constraints>
Always do:
1. Read the manual first: the name the machine shows for it ("INIT", "Init Voice", "Basic"), the key combination or menu entry that loads it, and whether it loads into the edit buffer or a slot.
2. Find the record in the firmware by its name: search the name as the display's own text (`names-first`'s sweep), then the code that copies from beside it. The record next to the name is the packed template; unpack it with the same packer the bank uses (`attribute-the-record`).
3. Find the keys in the code: from the key-scan handler (the routine that reads the panel matrix), follow the combination the manual names to the routine that copies the template, and record the combination as the code tests it (which keys, held or pressed, in which mode). Where manual and code disagree, the code wins and the disagreement is logged.
4. Check the record against the machine's own evidence: a factory sheet of INIT values, a sysex dump of an initialised patch, or the display's values right after loading it in an emulator run as a program.
5. Write the record as data with its source tag (`[FW]` and the template's address), and the key combination beside it, where the engine's new-patch path and the panel read them.

Never do:
- Use a starter patch of our own as INIT on a reproduction.
- Take INIT values from a sibling machine or from a preset that happens to be called "Init" in a later bank.
- Confuse INIT with the reset: the reset is what the machine does before any record loads (`find-the-reset`).
</constraints>
