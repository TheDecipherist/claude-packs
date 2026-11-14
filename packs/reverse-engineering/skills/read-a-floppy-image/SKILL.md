---
name: read-a-floppy-image
description: Use when a synth OS or bank arrives as a floppy disk image, before its files are listed or any file is read.
---

# Read a floppy image (one job: a floppy image read to its files, with the layout assumed printed)

Machine disks are mostly FAT12 with a vendor wrapper. A reader that assumes the common layout reads another's data as an empty disk.

<constraints>
Always do:
1. Find sector 0 by validating a BIOS Parameter Block, not by offset. A vendor header before sector 0 costs nothing: skip it and say so.
2. Honour the declared reserved-sector count; it need not be 1.
3. Walk the FAT12 chains (12-bit packing) to list and extract the files.
4. Refuse a non-FAT12 image: print its first 32 bytes and stop, never guess.
5. Print the layout assumed (header size, reserved sectors, FAT count, cluster size) with every result.

Never do:
- Read a disk at fixed offsets from a sibling's image.
- Report an image empty when only the layout was not met.
</constraints>

Where the disk came from: `gather-sources/source-kinds.md`.
