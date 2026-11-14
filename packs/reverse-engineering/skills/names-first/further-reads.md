# Further reads for names-first

Read by `names-first` beside `sweeps.md`. Each is a step of the same job: names found and tables located before code is read.

- **Before a sweep (step 0).** Read the project's recorded tables and `re-notes.md` before sweeping, and log any disagreement with them as a finding.
- **Display geometry (with step 1).** Read the display geometry from the manual, and search a display-table record of lines times columns plus a terminator (2 x 16 gives 33 bytes); a name table is a parallel table that fixes the data table's length and order.
- **A SysEx OS update (with step 3).** Test a packing against the address advance per message (244 packed bytes advance the address by 213), then the checksum, before any conclusion rests on the unpack.
- **A consumer found (with step 13).** "Firmware feeds value X into table Y" is one source: after the consumer is found, compare the table's span with the manual's range and the patch names (3000:1 against 200:1 says it is not that table).
- **A mark in a preset name.** Copy a preset name verbatim, marks included (a `*` is typed into the ROM); check a published list's oddity against the ROM before correcting it.
- **A screen descriptor.** Score load addresses by 16-bit words pointing back into the file, then read the descriptor's 16-byte records for field order and grouping.
- **Never name a block from its base address.** Name it by its own parameter names and what the presets store (a phaser, not a flanger).
