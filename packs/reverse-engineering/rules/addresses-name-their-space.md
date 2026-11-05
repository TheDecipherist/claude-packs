---
# concepts: cpp, js, notes, tooling
---

# Every address names its space, and a table its bounds

<constraints>
Always do:
- Say what each address is: a file offset, a CPU address, a physical address, `seg:off`, a DSP `P:`, `X:` or `Y:` address, or a word index. Record the load map, and prove a base by scoring.
- Find a table's own start and end before reading it. A `[FW]` tag covers the bytes, the boundary and the role separately.
- Index records by their marker over the whole image, and state the count and the gaps. A scan of one range found 47 of 174.
- Make an unpacked image answer "was this address ever written?". A zero read past where the loader stopped is unknown, and one blocked a law for a whole phase.
- Print a table and check a known parameter before publishing what a field means. A compare instruction alone got min and max backwards.
- Re-derive a field per block: one table's bytes can change meaning partway through.

Never do:
- Read a stride across a segment: that invented a 2469-entry table.
- Trust "exactly twice" from two or three points. A wrong index looks like a scale factor.
- Call a block compressed or empty before reading what loads it. A 3-byte header in each bank had shifted the alignment.
- Take "it disassembles" as proof of code: count the undecodable words against a baseline.
</constraints>
