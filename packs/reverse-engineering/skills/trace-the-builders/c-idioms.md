# Compiled-C idioms to read in a builder (reference for `trace-the-builders`)

- Jump tables: an indexed load of a code address after a bounds compare; the compare's constant is the case count.
- Switch on switch: a second table indexed by the first's result; read the outer table's entries as one family.
- Trampolines: a stub that only loads a register and jumps; the target is the routine, the stub is not.
- Runtime-registered dispatch: handler addresses stored into RAM at start-up; read the registration, not the call site.
- Bit-packed flags: one byte tested with several masks; list each mask with the code it guards.
- Sign selects mode: a signed field whose sign picks one of two paths; the magnitude is the same parameter.
- Bipolar coefficient: a centred field (0x40 or 0x80 is zero) subtracted before scaling; the centre is part of the law.
