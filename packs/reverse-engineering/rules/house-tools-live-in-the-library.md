---
# concepts: cpp, js, notes, tooling
paths:
  - "placeholder"
---

# A disassembler or an emulator is written once, in the reference library, never inside one project

A tool that serves every machine with that processor belongs where every run looks first. Three sessions wrote the same 6809 disassembler, two of them twice, before the house collection existed; a 6809 interpreter lived in one rebuild's tests, where the next 6809 machine would never look (the user, 2026-11-13: "new disassemblers should never be in a project ... it now should be in the library with everything else thats used globally").

<constraints>
Always do:
- Look in the reference library's `toolchain/` shelf first (`claude-packs toolchain`, the `re-toolchain` skill), and use what is there.
- Write a missing disassembler in `toolchain/disassemblers/FAMILY/`, with its row in that folder's README; write a missing emulator's CPU core in `toolchain/emulators/FAMILY/`, with a README whose first line names its families.
- Keep in the project only what is the machine's own: its memory map, its peripherals, its test rig around the shared core.

Never do:
- Write a disassembler in a project's `tools/`; `disassembler-in-the-library` refuses it.
- Copy a third-party emulator's or disassembler's code into the library or a project: run it as a separate tool, and list it in `toolchain/third-party.md`.
</constraints>

## Check
Lesson check: `disassembler-in-the-library`.
