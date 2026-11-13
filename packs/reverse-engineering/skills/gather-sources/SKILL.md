---
name: gather-sources
description: Use when starting work on a machine, or before disassembling anything.
---

# Gather the sources in the right order (one job: read what exists before reading code)

<constraints>
Always do:
1. Read the folder: text files, filenames, the shape of the dump set. Look the machine up in the archive first, and hash every file (`node .claude/tools/source-ledger.mjs --hash <folders>`) against what is held and against the siblings' folders, before planning: a dump may be one image under two names, or a sibling's. Search the ROM's part number before the machine (one mask ROM was the key assigner of three machines). Write the inheritance down with the hashes.
2. Read the owner's manual (`pdf-to-md`) for what the machine calls things, and search the image for those names (`names-first`). This is the fastest step there is: do it before everything below.
3. Read the maker's sysex document.
4. Read the service manual, and check the scan is whole. In it, read the parts list first: it names both CPUs, the DAC, the filter and the crystal, and its adjustment and check tables carry absolute numbers the ROM cannot. Check for a real text layer first; where there is none, or a cell is in dispute, read the rendered page, not the OCR.
5. Fetch the maker's manuals for every processor the firmware runs on (the CPU, a sub CPU, every DSP), yourself: never ask the user to find one. For each: its programming or family manual (the instruction set, the addressing modes, the cycle counts) and its data sheet (the memory map, the peripherals, the clock set-up). Look where `datasheet-sources.md` (beside this file) says, in its order: the reference library (`chip-search`), the archive, the maker or its successor, alldatasheet, then the other archives. Save each PDF in the machine's archive folder, outside every repo (a project ignores `*.pdf`), read it by `pdf-to-md`, bring the Markdown into the reference library under the part, and write in `docs/sources.md` where it came from, its title, revision and date. A manual that cannot be fetched is the last step's case. The interpreters, disassemblers and oracles are written from these manuals, never from memory.
6. Read other people's conversions as `[PUB]` leads.
7. Read the disk OS's own strings.
8. Check the tool table before writing a disassembler.
9. Take ratios from a redrawn trace, never absolutes. A printed scope photo with a graticule may give a time once its graticule and same-size tests pass; a redrawn trace still gives ratios only.
10. A source that exists and cannot be fetched (the host refuses automated access, the file is behind a login): record its name, where it is, what refused, and what it would have settled, in the project's decisions. Mark what rests on its absence as a `[gap]`, ask the user for the file when a person is there, and go on with the next source.

11. No dump is possible (a mask ROM, a pre-MIDI unit, presets in ROM with no dump format): say so, stop looking for a dump, and go on (the order's no-firmware branch).
12. Read what `source-kinds.md` (beside this file) lists before calling a source missing: the vendor's updater, where the factory sounds live, what the machine boots from, host-side editor templates, patents and the designer's later products, panel artwork and photos, and the site list.
13. Record the OS version of every manual and every traced image, and read the matching manual: a feature the manual has and the firmware lacks is a version mismatch before it is a mistake.
14. Write every new source, every failed search and every finding back to the archive under the model, with a per-model `re-notes.md`, so the next machine starts from it.

Never do:
- Start the disassembly before steps 1 to 4.
</constraints>
