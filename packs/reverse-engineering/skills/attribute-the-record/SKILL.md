---
name: attribute-the-record
description: Use when the bytes of a stored patch, program or preset are to be mapped to the machine's running parameters, when a sysex spec, a receive or bulk-dump handler, a controller table or a packer is found, or before any stored offset is given a name.
---

# Attribute the record (one job: map every stored byte of a patch to the running record through the code that receives, reads and sends it)

A stored offset named from its statistics alone is a guess. The code that receives a dump, unpacks it and sends it back says what each byte is, and that code is the first source; the corpus is the second.

<constraints>
Always do:
1. Anchor first: find the facts the sysex spec states (message-length table, record base, first factory name) at their addresses in the image. A spec that cannot be placed is not yet a source.
2. Read the receive handler and the bulk-transmit handler: record size, stride, repacking, the conversion between the RAM form and the wire form, and the errors the spec lists.
3. List every representation of the record (stored, runtime struct, live UI globals, DSP staging) and resolve the base register before naming a store.
4. Size the record by its own arithmetic: wire bytes minus the MSB/LSB expansion, and store size times stride filling the RAM.
5. Read the firmware's own field table (`{max, width, kind}`) and its deserialiser before any statistics. Find the packer and its inverse and interpret them; the encoder confirms the layout.
6. Build the controller-to-offset table (256 entries, `0xFFFF` = indirect) by constraint search over two or three sure pairs. A hit must also pass a check it was not fitted to. Where options register their own NRPN handlers at run time, walk every handler and check each against the manual's name.
7. Verify a byte's meaning by sweeping it through a reader harness and watching the consumer. Check that one byte feeding three consumers has its own meaning in each block.
8. Find the INIT patch by its name: it is the packed template. Read the trailer word as the active parameter count and a record word as the default column.
9. Expect hardware control words in the patch beside the named parameters: the named ones are the mod layer. Payloads may be `{id,value}` pairs with unused and end markers.

Never do:
- Name a stored offset from its statistics or from a sibling machine's layout.
- Transcribe a packer's output: interpret the packer.
</constraints>
