# Family traps

Read by `re-toolchain`: print the row beside each tool for its family. Each trap yields a listing that looks fine and is wrong. Check a new disassembler's opcode map entry for entry against a reference (`prove-a-disassembler`).

- **uCOM-4:** the program counter wraps inside a 256-byte page; a long jump rewrites only the low 6 bits; the instruction after an LI is skipped when it is another LI.
- **uPD7810:** there is no conditional branch, only skips after a compare; an L0 or L1 operand overlay changes the operand's meaning; a CALT table holds call vectors.
- **MCS-48:** a missing opcode (0x52, `JB2`) stalls descent, and a mask ROM may be shared across machines.
- **HD6301 against 6801:** the 6301 has three-byte bit operations (AIM, OIM, EIM, TIM) the 6801 lacks; use the 6801 mode of the tool only where they are absent.
- **H8/500 against H8/300H:** different instruction sets: a linear pass over one with the other's tool desyncs on data. An AN1x image is byte-swapped.
- **DSP5636x and 56300:** unpack the image first; a C string is one character per 24-bit word.
- **SH family:** a `mov.l` then `jsr` needs a register shadow to resolve the target (reach went from 0.5 % to 4.7 %).
- **Z80:** score the base address; a wrong base reads 0.5, the right one 0.99. **6502:** a pin-scrambled dump is a wiring problem, not code.
- **SH family, more:** consecutive BRA opcodes (0xAxxx) read as a pointer table, and a sign-extended `mov.w` of -1 equals 0xFFFFFFFF, so a literal-pool census gave 31,017 false hits. SuperH is big endian on a 32-bit ROM bus.
- **Cortex-M:** use capstone Thumb or `llvm-objdump --triple=thumbv7m`; write no disassembler.
- **TI C2000:** `TMS320` names a product line, not an architecture. Read the memory map from `MOVW DP,#16bit` (`0x761F` then the page; page x 64 is the address). `unidasm -arch tms32025` on C28x is the vendor-name trap.
- **uPD78312:** it is 78K/III; an 8080-descended decoder gives plausible nonsense.
- **NEC V20, V30, V50, V55 (uPD70433):** 8086-compatible, so the x86 tool applies.
- **uPD650:** 4-bit uCOM-43 (a uPD546 manual stands in).
- **Z80 against 8080/8085:** with no Z80 prefix opcodes a listing is valid as Z80 or 8080/8085.
- **H8/300 against H8/300H:** H8/300 (16-bit) differs from H8/300H.
