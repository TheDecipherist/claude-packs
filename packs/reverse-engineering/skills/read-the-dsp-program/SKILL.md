---
name: read-the-dsp-program
description: Use when a DSP program must be found, carved or read, when a host-interface register block or program-download loop appears in the firmware, or when an effect structure is decided.
---

# Read the DSP program (one job: find, carve and read a DSP program so its consumption fixes units and structure)

A host-only reading of a value is provisional. The DSP that consumes the word fixes its unit, and the program fixes the structure.

<constraints>
Always do:
1. Look for the loader, not a second EPROM: a host-interface register block at a stride, a word-write routine, the loop's source pointer and terminator, and the size against the program RAM. Find the download path on the schematic and identify the chips by their transfer protocol.
2. Carve the images by the family's bootstrap signature (length and start before the first words), with one generic carver rather than one per image. Split a DSP container into records before decoding; a threaded-code engine reads as records of calls.
3. Calibrate the host-to-DSP word convention on slots known elsewhere (slot = er1/2^31; a fractional MAC does not double).
4. Let the consumer fix the unit: when the DSP squares the LFO rate word, the host-only law is provisional until it matches.
5. Tell allpass from comb by the feedback sign and the feedforward add. A driver with no conditionals means the routing is data.
6. Read (pointer, mask) pairs as circular-buffer registers: they are the audio memory map.
7. Check a recovered coefficient table's frequency response and its axis order before using it.

Never do:
- Fix a unit from the host code alone.
- Decode a container before it is split into records.
</constraints>
