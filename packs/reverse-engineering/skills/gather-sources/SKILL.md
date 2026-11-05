---
name: gather-sources
description: Use when starting work on a machine, or before disassembling anything.
---

# Gather the sources in the right order (one job: read what exists before reading code)

<constraints>
Always do:
1. Read the folder: text files, filenames, the shape of the dump set.
2. Read the maker's sysex document.
3. Read the service manual, and check the scan is whole. Read images, not OCR.
4. Read other people's conversions as `[PUB]` leads.
5. Read the disk OS's own strings.
6. Check the tool table before writing a disassembler.
7. Take ratios from a redrawn trace, never absolutes.

Never do:
- Start the disassembly before steps 1 to 3.
</constraints>
