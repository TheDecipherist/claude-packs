---
name: gather-sources
description: Use when starting work on a machine, or before disassembling anything.
---

# Gather the sources in the right order (one job: read what exists before reading code)

<constraints>
Always do:
1. Read the folder: text files, filenames, the shape of the dump set.
2. Read the owner's manual for what the machine calls things, and search the image for those names (`names-first`). This is the fastest step there is: do it before everything below.
3. Read the maker's sysex document.
4. Read the service manual, and check the scan is whole. Read images, not OCR.
5. Read other people's conversions as `[PUB]` leads.
6. Read the disk OS's own strings.
7. Check the tool table before writing a disassembler.
8. Take ratios from a redrawn trace, never absolutes.

Never do:
- Start the disassembly before steps 1 to 4.
</constraints>
