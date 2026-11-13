---
name: gather-sources
description: Use when starting work on a machine, or before disassembling anything.
---

# Gather the sources in the right order (one job: read what exists before reading code)

<constraints>
Always do:
1. Read the folder: text files, filenames, the shape of the dump set.
2. Read the owner's manual (`pdf-to-md`) for what the machine calls things, and search the image for those names (`names-first`). This is the fastest step there is: do it before everything below.
3. Read the maker's sysex document.
4. Read the service manual, and check the scan is whole. Check for a real text layer first; where there is none, or a cell is in dispute, read the rendered page, not the OCR.
5. Fetch the maker's manuals for every processor the firmware runs on (the CPU, a sub CPU, every DSP), yourself: never ask the user to find one. For each: its programming or family manual (the instruction set, the addressing modes, the cycle counts) and its data sheet (the memory map, the peripherals, the clock set-up). Look in the reference library first (`chip-search`), then the archive, then the maker's site (Motorola and Freescale parts at NXP, Hitachi parts at Renesas, and so on), then the datasheet archives (bitsavers, alldatasheet, datasheetarchive, the Internet Archive). Save each PDF in the machine's archive folder, outside every repo (a project ignores `*.pdf`), read it by `pdf-to-md`, bring the Markdown into the reference library under the part, and write in `docs/sources.md` where it came from, its title, revision and date. A manual that cannot be fetched is the last step's case. The interpreters, disassemblers and oracles are written from these manuals, never from memory.
6. Read other people's conversions as `[PUB]` leads.
7. Read the disk OS's own strings.
8. Check the tool table before writing a disassembler.
9. Take ratios from a redrawn trace, never absolutes.
10. A source that exists and cannot be fetched (the host refuses automated access, the file is behind a login): record its name, where it is, what refused, and what it would have settled, in the project's decisions. Mark what rests on its absence as a `[gap]`, ask the user for the file when a person is there, and go on with the next source.

Never do:
- Start the disassembly before steps 1 to 4.
</constraints>
