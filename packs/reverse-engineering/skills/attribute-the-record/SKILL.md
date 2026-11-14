---
name: attribute-the-record
description: Use when a stored patch's bytes are to be mapped to the running parameters, when a sysex spec, receive or bulk-dump handler or packer is found, or before a stored offset is named.
---

# Attribute the record (one job: map every stored byte of a patch to the running record through the code that receives, reads and sends it)

A stored offset named from its statistics alone is a guess. The code that receives a dump, unpacks it and sends it back says what each byte is, and that code is the first source; the corpus is the second.

<constraints>
Always do:
1. Anchor first: find the facts the sysex spec states (message-length table, record base, first factory name) at their addresses in the image. A spec that cannot be placed is not yet a source.
2. Read the receive handler and the bulk-transmit handler: record size, stride, repacking, the conversion between the RAM form and the wire form, and the errors the spec lists.
2b. Test first whether the layout equals the RAM layout: take three parameters whose map positions are known and see whether the driver's displacements line up with the sysex offsets, before any layout is named.
3. List every representation of the record (stored, runtime struct, live UI globals, DSP staging) and resolve the base register before naming a store.
4. Size the record by its own arithmetic: wire bytes minus the MSB/LSB expansion, and store size times stride filling the RAM.
5. Read the firmware's own field table (`{max, width, kind}`) and its deserialiser before any statistics. Find the packer and its inverse and interpret them; the encoder confirms the layout.
6. Build the controller-to-offset table (256 entries, `0xFFFF` = indirect) by constraint search over two or three sure pairs. A hit must also pass a check it was not fitted to. Where options register their own NRPN handlers at run time, walk every handler and check each against the manual's name.
6a. A case that stores and then calls a routine its siblings do not call is a side effect to read: check whether the stored byte has a second home chosen by a mode flag, and read the manual chart's global-channel flags.
7. Verify a byte's meaning by sweeping it through a reader harness and watching the consumer. Check that one byte feeding three consumers has its own meaning in each block.
8. Find the INIT patch by its name: it is the packed template. Read the trailer word as the active parameter count and a record word as the default column.
9. Expect hardware control words in the patch beside the named parameters: the named ones are the mod layer. Payloads may be `{id,value}` pairs with unused and end markers. Where a patch holds raw hardware words, read the calibration or autotune routine as a naming document: it pins which array words it holds and which it sweeps, so name each word from what it writes, and test the guess against its mode over the bank.
10. Where a unit can send dumps, change one knob per dump and diff the sysex to attribute the bytes. When hardware may come, write the ordered list of the smallest measurements and which open item each closes.
11. Prove a stored unit from presets named for a duration (a flanger storing 10 and a widener storing 8 mean 0.1 ms units), and treat the largest stored value as only a lower bound on the ceiling until the range table is found.
12. Check each charted range and route of a published chart against the corpus's use of it (a complete-looking chart can overstate what the machine does), and record the slots that are fixed in every program.

Never do:
- Name a stored offset from its statistics or from a sibling machine's layout.
- Transcribe a packer's output: interpret the packer.
</constraints>
