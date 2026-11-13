# re-b report (W1, U6 to U11)

| id | new or extend | pack and file | its one thing | proof |
|---|---|---|---|---|
| U6 | new | reverse-engineering `skills/attribute-the-record` | map every stored byte of a patch to the running record through the code that receives, reads and sends it | pressure test |
| U7 | new | reverse-engineering `skills/read-the-dsp-program` | find, carve and read a DSP program so its consumption fixes units | pressure test |
| U8 | new | reverse-engineering `skills/find-the-timer` | derive tick and control rate from firmware before any stored time | pressure test |
| U9 | new | reverse-engineering `skills/absolute-scale-from-firmware` | register words to Hz, seconds, dB with no ear | pressure test |
| U10 | new | reverse-engineering `rules/layout-closes-on-itself.md` | a layout is proved by closing arithmetic not used to fit it (C11) | paths |
| U11 | new | reverse-engineering `skills/profile-the-bank`, `tools/byte-profile.mts` | per-offset profile of a bank | `test/tools/reverse-engineering/byte-profile.test.mts` (red shown once by changing the planted constant offset: 1 fail) |

Not done: the sentence in `two-sources-before-naming` (another agent's).

## Pressure scenarios
- U6 fire: a build has a Matrix-style sysex spec and a carved image. The bulk-dump handler repacks 7-bit pairs; the INIT patch is found by name. Near miss: choosing a stride from per-column entropy alone (U11).
  Followed run: anchors the spec's length table in the image, reads receive and transmit handlers, resolves the base register, sweeps a byte through a harness, checks the NRPN handlers against the manual.
- U7 fire: firmware writes words to a host-interface register block in a loop; no second EPROM exists. Near miss: a clock tick question (U8).
  Followed run: finds the loader, carves by bootstrap signature, calibrates the word convention, lets the DSP's squaring of the rate word fix the unit.
- U8 fire: a stored LFO rate reads 188 Hz at the top under a guessed tick. Near miss: scaling a pitch table against 440 (U9).
  Followed run: checks live vectors, writes crystal-to-tick arithmetic as `[FW]`, reads the counter mode, pins the clock from three readings.
- U9 fire: firmware sets a chip register to equal A4 and the manual prints delay maxima of 2^n samples. Near miss: carving a DSP image (U7).
  Followed run: anchors the 440 equate, fixes Q format, takes the sample rate from the maxima, scans the law over the image.
- U11 fire: 64 carved patches of unknown byte meaning. Near miss: naming an offset from the manual (U6).
  Followed run: runs byte-profile, classes offsets, counts using patches, keeps the CSV, names nothing from statistics.

## Rule paths
`layout-closes-on-itself` uses concepts `cpp, js, notes, tooling` like its siblings (`two-sources-before-naming`): governs source, notes and tools of a reverse-engineering project.

## Faults
None. No hook refusal.
