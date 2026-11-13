---
name: prove-a-disassembler
description: Use when a house disassembler has been written from a CPU manual, when a disassembler's opcode table changes, or before its listing is trusted for a naming or a law.
---

# Prove a disassembler (one job: every opcode agrees with a reference disassembler's output on the same bytes)

A disassembler written from the CPU manual looks right on the routines read first and is silently wrong on the rest: a family trap, a missing opcode, an operand in the wrong order. A listing is only as good as its opcode table, so the table is proved opcode for opcode against a reference disassembler run as a program (MAME's `unidasm`), never against code copied from one. Nothing is ported.

<constraints>
Always do:
1. Name the reference: `unidasm` for the processor (`unidasm -arch <cpu>`), found by the `re-toolchain` scan. Run it as a separate program. Never read, copy or link its code, and list it in `toolchain/third-party.md`.
2. Build the test input from the CPU manual, not from the reference: for every opcode the manual defines, one byte string with each operand form and mode, padded so no instruction reads past the end. Include the family's traps (`re-toolchain`'s `family-traps.md`).
3. Run both disassemblers on the same bytes, one opcode per run or per labelled block, and compare mnemonic, operands and length, normalising only spelling (case, spacing, hex prefix). Write the comparison as a test in the library beside the disassembler (`house-tools-live-in-the-library`).
4. Read every disagreement before changing anything. The manual decides which side is right: the reference has bugs too. Fix our table, or record the reference's fault with its page of the manual.
5. Count the opcodes covered against the manual's table, and print the count and the list of any not covered. An opcode the reference leaves undefined is listed as such, never counted as agreed.
6. Plant a fault: change one opcode's operand order in the table, and see the test go red; put it back.
7. Re-run the whole comparison when the table changes. Say in the library's README row that the disassembler is proved, and against which reference version.

Never do:
- Call a disassembler proved because it decodes one routine, or because it disassembles without error.
- Compare a disassembler's output with itself, or with a listing it produced earlier.
- Port, copy or translate the reference's source to save the work of reading the manual.
- Commit the reference's output as a listing of a firmware image: the test builds its bytes in a temporary folder.
</constraints>
