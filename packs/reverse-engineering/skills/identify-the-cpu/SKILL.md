---
name: identify-the-cpu
description: Use when an image's processor is not yet proved, when a vendor name or board photo is the only evidence for the CPU, when a listing looks plausible but wrong, or before a disassembler is chosen.
---

# Identify the CPU from the image (one job: name each processor, proved three ways, before a disassembler is chosen)

A vendor name is not an architecture, and a wrong decoder prints plausible fiction, not an error. The processor is named from the bytes: a reset signature, an opcode census, and a table or pair that only that processor explains. Two agreeing proofs of three are not enough to start a listing.

<constraints>
Always do:
1. Read the reset and vector signatures: an x86 far JMP at the top, a 68000 table at 0, the 0xFFFE vector of a 6502 or 6809, a Cortex-M initial stack pointer followed by odd handler addresses. Add the boot idiom, a compiler banner and the initial SP.
2. Count opcodes per candidate ISA in both byte orders: positional measures, not histograms, with a known machine's image of each candidate as the control. Extended-addressing opcodes per KB say which files are code.
3. Prove a third way: a vector table whose unused entries carry their own index proves table, base and decoder at once; so does a prologue and epilogue pair repeated across the image.
4. Interleave byte and half-word pairs, then run the signature again: even/odd or adjacent banks is told by whether the family idiom appears whole. Swap byte-swapped 16-bit images before reading code. Shared vendor entry-point headers are headers, not desyncs.
5. Read the MAME set as a black box: `-listxml` gives the CPU, clock and ROM map; an overlaid ROM means dump both and diff.
6. Give each guess a confidence (known, high, medium, low) and keep a hand override file the run reads, so a decision of the user beats the census.
7. Read, per page, which RAM base the absolute operands address: a second base shows a second program in the image. No pointer walk into the chip's window means an ASIC or a fixed-function part, not a loadable DSP. A zero count of EI instructions and vectors means a polled loop, and that decides where a time base can be.
8. Where no disassembler exists for the ISA, record its prologue and epilogue fingerprint and stop there, as `re-toolchain` says. For C2000 read the memory map from the `MOVW DP` operands; for Cortex-M, Thumb.
9. Write the proved answer, processor by processor with its three proofs, where `re-toolchain` reads it for its `processors:` line.

Never do:
- Pick a disassembler from the vendor name or the product's age.
- Disassemble with an unproved processor and report the listing as a finding.
- Reduce a guess to one proof because the other two were not run.
</constraints>
