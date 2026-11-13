# re-d, step W1, item 19: E1 to E18 and prove-a-disassembler

Proof column: T = `test/tools/reverse-engineering/names-modes.test.mts`, S = `names-sweep.test.mts`, L = `source-ledger.test.mts`. "paths" = a rule or skill text with no test. All files under `packs/reverse-engineering/`.

| id | new or extend | file | its one thing | proof |
|---|---|---|---|---|
| E1.1-E1.5 | extend | rules/every-law-has-a-source.md | one tag list with DS, REF, EMU, SVC, DER, PHOTO, ASSUMED, MEAS; COR weak; host-only law provisional; chip fact vs board; same button name | paths |
| E1.6 | dropped | (check untouched) | SORTED s3: the check does its one job | none |
| E2.1-E2.8 | extend | rules/two-sources-before-naming.md | test as source, scope check, translation = one source, trimmer pair, firmware first, sibling enums, arithmetic arbiter, C11 closure sentence pointing to `layout-closes-on-itself` | paths |
| E3.1-E3.4 | extend | rules/a-negative-names-what-was-scanned.md | negative states encodings/strides, change question after three images, tool layout printed, analogy checked | paths |
| E4.1-E4.3 | extend | rules/addresses-name-their-space.md | image name/version/md5, grid filter, decompressed offsets | paths |
| E5.1-E5.2 | extend | rules/findings-are-withdrawn-in-place.md | comment is no evidence; correction asserted in tool | paths |
| E6.1-E6.4 | extend | rules/reproduction-or-original.md | anomaly kept as machine has it, footnoted, tested, no switch; extra controls to our edit layer labelled ours; no-patch-memory record is ours; variants as range table | paths |
| E7.1-E7.3 | extend | rules/account-every-term.md | named term fields, firmware domain, two-input VCA | paths |
| E8.1 | extend | skills/names-first step 14 + tools/lib/names-runs.mts, `--run` | packed width-prefixed tables count themselves | T `--run` |
| E8.2, E8.3, E8.6, E8.8, E8.9, E8.10 | extend | skills/names-first/sweeps.md (new reference), step 17 | keyword/units net, word stream, suffix lists, loader messages, character table, effect vocabulary | paths; word stream also T (24-bit mode) |
| E8.4 | extend | step 15 + tools/lib/names-index.mts, `--index` | name-to-index vs shift, stride, shuffle controls | T `--index` |
| E8.5, E8.7 | extend | step 16 | missing string vs panel; generated names | paths |
| E8.11 (C10) | extend | names-first Never reworded | panel table columns read, not assumed | paths |
| E9.1 | extend | gather-sources step 1 + tools/source-ledger.mts `--hash` | hash pass, part number first | L hash pass |
| E9.2-E9.4, E9.7-E9.11 | extend | gather-sources/source-kinds.md (new reference), step 12 | updater, factory-sound homes, boot media, editor templates, patents/designer/sibling, supplier spec, artwork, site list | paths |
| E9.5 | extend, reworded | gather-sources step 4 | parts list first, inside the service manual | paths |
| E9.6 | extend | step 13 | OS version of every manual and image | paths |
| E9.12 | extend | step 14 | write back to the archive | paths |
| E9.13 | extend, reworded | step 9 | graticule and same-size tests give a time; redrawn trace ratios only | paths |
| E9.14 | extend, reworded | step 11 | no dump: say so, stop looking, go on | paths |
| E10.1-E10.3 | extend | skills/re-deliverables | histogram, repro commands, confidence column, git log, day-one list, predictions | paths |
| E11.1, E11.2, E11.3 (C17), E11.4 | extend | skills/bank-census | per-mode count, rerun after [EAR], flat column, corpus counts as tests | paths |
| E12.1-E12.4 | extend | skills/re-toolchain + family-traps.md, install-recipes.md | trap list per tool row, seeded descent, install recipes, small interpreter in library | paths |
| E13.1 (C4), E13.2 | extend | rules/house-tools-live-in-the-library.md | nothing ported, unidasm black box; prove a disassembler; measure on second occurrence, refuse loudly | paths |
| E14.1-E14.5 | extend | skills/read-a-circuit-diagram step 9 | parts list beats diagram, revision diff, topology predicts, tolerance as intent, CV tap | paths |
| E15 | extend | skills/gather-sources/datasheet-sources.md | per-chip function and table kind, family manual | paths |
| E16 | extend | skills/menu-map step 1b | calibration menu before tuning table | paths |
| E17 | extend | skills/tripwire-the-law step 6 | fix order | paths |
| E18 | extend | tools/lib/unwrap.mts + tools/lib/unwrap-proofs.mts | new modes: SMF sysex, nibble-swapped, Clavia 8-in-7, 24-bit one char per word, address-line swaps (wrappings); 24-bit LSB payload start by header checksum, Moog span, XOR key from erased runs, stride and checksum proofs, one block per file (functions). Existing modes untouched | T |
| prove-a-disassembler | new | skills/prove-a-disassembler | house disassembler proved opcode for opcode against unidasm | pressure test |

## Notes
- Test split: the 300-line limit refused additions to `names-sweep.test.mts`, so the new cases are in `names-modes.test.mts`, with the shared image helpers moved (old copy out first) to `names-fixtures.mts`. All registered in `pack.json`.
- E18 "24-bit LSB words": the existing "24-bit words reversed" wrapping already covers it; the header-checksum proof is `payloadStarts`.
- Renumbering: read-a-circuit-diagram step 9 "Keep change-order.md" is now step 10 (a new step 9 went before it).
- Refusals: template-law refused `runsReport` (same name as a function in base's run-status); renamed `widthTablesText`. Right.

## prove-a-disassembler scenarios
1. Must fire: a run has written a 6809 disassembler in the library from the Motorola manual and is about to read the Matrix-12's firmware with it. The skill makes it build one byte string per manual opcode and mode, run `unidasm` on the same bytes, compare mnemonic, operands and length, and read each disagreement against the manual. It does not decode a routine and call it done.
2. Near miss: the same run must choose which disassembler exists for the H8 (a `re-toolchain` job) or write the emulator core (`house-tools-live-in-the-library`). The skill stays silent.
Followed run would: list opcodes from the manual, run unidasm as a program, count covered opcodes, plant a wrong operand order and see red, record the unidasm version in the README row.
