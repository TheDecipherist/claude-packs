---
name: re-toolchain
description: Use when a work order or a reverse engineering of firmware starts, when its processors are named, or before a disassembler, an interpreter, an emulator or an oracle is written or chosen.
---

# Settle the toolchain for every processor before the run (one job: nothing a reverse engineering needs is found missing halfway)

A run that meets a missing tool hours in either stops or improvises: one order said "Ghidra for the H8 code" and Ghidra had no H8 module; the same order told the run to write a DSP disassembler blind, while the house collection had one. This step finds, for every processor the firmware runs on, a disassembler, an emulator, a Ghidra module and the maker's manuals, before the run, and the pre-flight refuses to start until each is settled.

<constraints>
Always do:
1. **Name every processor** the firmware runs on: the host CPU, any sub CPU, every DSP and effects processor, from the proved answer of `identify-the-cpu`, the archive's recon, the reference library (`chip-search`), the manuals and the board photos (`boards-from-photos`). Write them on the order's install block line `processors: H8/300H, DSP56300`.
2. **Scan this machine:** `npx @thedecipherist/claude-packs toolchain PROCESSOR... --out docs/workorders/NAME/toolchain.md`. It looks at our own tools first (the reference library's `toolchain/` shelf: `toolchain/disassemblers` and `toolchain/emulators`; every project's `tests/oracle` interpreter; the tools under `~/firmware`), then what is installed (`~/firmware/src`, binutils' objdumps, MAME's `unidasm`, Ghidra's modules) and the reference library, and writes one row per processor with each find: ours or third-party, its path and its licence.
3. **Settle every `missing`,** cell by cell:
   - a disassembler: the library's `toolchain/disassemblers` first; a missing one is written there, never in a project, with its row in that folder's README, so the next machine finds it;
   - an emulator: search online (GitHub for the CPU's name with "emulator" or "simulator", MAME's CPU cores, the open-source projects that emulate the machines that used it) and write each find in the cell with its address and licence;
   - none anywhere: **ask the user** whether to build our own, in the library's `toolchain/emulators/FAMILY/` (the CPU core only: a machine's memory map and peripherals stay in its project's tests) (several house rebuilds did: the Matrix-12's 6809, the V-Synth GT's SH-4A), and write their answer in the cell: `build our own (the user, yes, DATE)`. With nobody there, the order cannot start: write what is missing in its `progress.md` and end, as the pre-flight would;
   - a Ghidra module and the manuals: as `workorder check` (the install block's `ghidra:` line) and `gather-sources` say.
4. **Use a third-party tool as a black box only:** run it, compare its outputs with ours, and never read, copy or link its code into the project (most emulators are GPL). Write in the order which tool checks which (the second reader of W4, the second emulator of W5).
5. **Commit `toolchain.md` beside the order.** `workorder check` refuses a run whose `processors:` line names a processor without a settled disassembler and emulator in it.

Never do:
- Plan a step on a tool nobody checked is there.
- Write a disassembler or an emulator the house already has, or one an open project already offers, without saying why in `decisions.md`.
- Treat "build our own" as settled without the user's yes in the cell.
</constraints>
