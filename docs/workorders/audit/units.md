# The audit's ledger: one row per unit and per extension line

Its size was fixed in W0, before any work: 107 ids named in `sources/DECIDED.md`, 248 in `sources/SORTED.md` section 7 (346 together, with R1, the release lock, which DECIDED.md names without an id), and 16 added: the ids SORTED.md section 6 lists as DECIDED (U26, E2.8, E8.11, E11.3, E13.1, E19.5, E21.1, E21.6, E52.1, E53.1, E61.1, E74.1, T6; see decisions.md d-2), L1 and L2 (the skill-use log and the rule-applied log, W2 item 1) and S1 (the shell text, W6 item 3). 362 rows.

Status: done, dropped (with the DECIDED.md or SORTED.md line), obsolete, or FOR THE USER.

| id | kind | pack and file | one thing | proof | commit | status |
|---|---|---|---|---|---|---|
| R1 | | | | | | |
| C1 | | | | | | |
| C2 | | | | | | |
| C3 | | | | | | |
| C4 | new + extend | packs/reverse-engineering/skills/prove-a-disassembler; rules/house-tools-live-in-the-library.md | a house disassembler is proved opcode for opcode against unidasm run as a program; nothing ported | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| C5 | | | | | | |
| C6 | | | | | | |
| C7 | | | | | | |
| C8 | | | | | | |
| C9 | | | | | | |
| C9a | | | | | | |
| C10 | extend | packs/reverse-engineering/skills/names-first (Never reworded, E8.11) | a panel table's columns are read, not assumed to hold or lack offsets | text in place | 3c7f57c | done |
| C11 | new + extend | packs/reverse-engineering/rules/layout-closes-on-itself.md; rules/two-sources-before-naming.md (E2.8) | a closure the layout was not tuned to is an independent proof | paths: build/evidence/W1/rule-paths.md | 3c7f57c | done |
| C12 | | | | | | |
| C13 | new | packs/reverse-engineering/skills/find-the-base | base scored on a linear read only, and why | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| C14 | | | | | | |
| C15 | | | | | | |
| C16 | | | | | | |
| C17 | extend | packs/reverse-engineering/skills/bank-census (E11.3) | a flat column is a wrong decode or fixed structure; decide by the code | text in place | 3c7f57c | done |
| U1 | new | packs/reverse-engineering/skills/triage-the-dump + tools/dump-triage.mts | say what each image is and whether it is whole, before anything is read from it | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed); test/tools/reverse-engineering/dump-triage.test.mts (stuck line red without the plant) | 3c7f57c | done |
| U2 | new | packs/reverse-engineering/skills/identify-the-cpu | name each processor from the image itself, proved three ways, before a disassembler is chosen | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U3 | new | packs/reverse-engineering/rules/decode-from-a-proven-boundary.md | a listing counts only from an address reached from a vector or a call target | paths: build/evidence/W1/rule-paths.md | 3c7f57c | done |
| U4 | new | packs/reverse-engineering/skills/find-the-base | prove where an image is loaded by a score with a stated margin, on a linear read only (C13) | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U5 | new | packs/reverse-engineering/skills/trace-the-builders (+ c-idioms.md) | read every routine that turns a record field into an engine coefficient | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U6 | new | packs/reverse-engineering/skills/attribute-the-record | map every stored byte of a patch to the running record through the code | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U7 | new | packs/reverse-engineering/skills/read-the-dsp-program | recover a downloaded DSP program from the host's loader | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U8 | new | packs/reverse-engineering/skills/find-the-timer | derive the time base from the crystal and the timer before any time law | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U9 | new | packs/reverse-engineering/skills/absolute-scale-from-firmware | take absolute frequency and time units from firmware anchors, with no ear | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U10 | new | packs/reverse-engineering/rules/layout-closes-on-itself.md | an exact closure the layout was not tuned to is an independent proof (C11) | paths: build/evidence/W1/rule-paths.md | 3c7f57c | done |
| U11 | new | packs/reverse-engineering/skills/profile-the-bank + tools/byte-profile.mts | the per-offset profile of a bank every attribution must agree with | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed); test/tools/reverse-engineering/byte-profile.test.mts (red with the planted profile changed) | 3c7f57c | done |
| U12 | new | packs/reverse-engineering/skills/find-a-table (+ table-shapes.md) | locate a table by known values or its shape, then confirm it in code | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U13 | new | packs/reverse-engineering/rules/a-field-may-be-an-index.md | before reading a field as a value, test whether it is an index and from which base | paths: build/evidence/W1/rule-paths.md | 3c7f57c | done |
| U14 | new | packs/reverse-engineering/skills/place-a-bit-field | place a field the documents do not settle by statistics a wrong place fails | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U15 | new | packs/reverse-engineering/skills/diff-the-revisions | compare builds of one machine structurally (tool on the library shelf) | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U16 | new | packs/reverse-engineering/skills/read-the-formatter | take each parameter's unit and curve from the routine that prints it | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U17 | new | packs/reverse-engineering/skills/manual-is-fully-covered | the closing check: every parameter, page and message the manual names is accounted for (names-first unchanged, still first) | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U18 | new | packs/reverse-engineering/skills/map-the-io | name each I/O address from the register map and what the code writes there | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U19 | new | packs/reverse-engineering/skills/find-a-sequence | find stored music by its signature and prove it by arithmetic | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U20 | new | packs/reverse-engineering/skills/sample-roms | assemble and decode sample ROMs | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U21 | new | packs/reverse-engineering/skills/byte-reach | the deaf count of stored bytes as the progress number of a decode | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| U22 | | | | | | |
| U23 | | | | | | |
| U24 | | | | | | |
| U25 | | | | | | |
| U26 | | | | | | |
| U27 | | | | | | |
| U28 | | | | | | |
| U29 | | | | | | |
| U30 | | | | | | |
| U31 | | | | | | |
| U32 | | | | | | |
| U33 | | | | | | |
| U34 | | | | | | |
| U35 | | | | | | |
| U36 | | | | | | |
| U37 | | | | | | |
| U38 | | | | | | |
| U39 | | | | | | |
| U40 | | | | | | |
| U41 | | | | | | |
| U42 | | | | | | |
| U43 | | | | | | |
| U44 | | | | | | |
| U45 | | | | | | |
| U46 | | | | | | |
| U47 | | | | | | |
| U48 | | | | | | |
| U49 | | | | | | |
| U50 | | | | | | |
| U51 | | | | | | |
| U52 | | | | | | |
| U53 | | | | | | |
| U54 | | | | | | |
| U55 | | | | | | |
| U56 | | | | | | |
| U57 | | | | | | |
| U58 | | | | | | |
| U59 | | | | | | |
| U60 | | | | | | |
| U62 | | | | | | |
| U63 | | | | | | |
| U64 | | | | | | |
| U65 | | | | | | |
| U66 | | | | | | |
| U67 | | | | | | |
| U68 | | | | | | |
| U69 | | | | | | |
| U70 | | | | | | |
| U71 | | | | | | |
| U73 | | | | | | |
| U74 | | | | | | |
| N1 | new | packs/reverse-engineering/skills/find-the-reset | map exactly what the machine sets before a patch loads, and in what order | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| N2 | new | packs/reverse-engineering/skills/find-the-init-patch | the machine's own INIT record, and the keys that load it | pressure test: build/evidence/W1/pressure (routing 3/3 fire, 3/3 silent; followed) | 3c7f57c | done |
| N3 | | | | | | |
| N4 | | | | | | |
| E1.1 | extend | packs/reverse-engineering/rules/every-law-has-a-source.md | one tag list (DS, REF, EMU, SVC, DER, PHOTO, ASSUMED, MEAS); COR weak; host-only law provisional; chip vs board; same button name | text in place; rule loads as before | 3c7f57c | done |
| E1.2 | extend | packs/reverse-engineering/rules/every-law-has-a-source.md | one tag list (DS, REF, EMU, SVC, DER, PHOTO, ASSUMED, MEAS); COR weak; host-only law provisional; chip vs board; same button name | text in place; rule loads as before | 3c7f57c | done |
| E1.3 | extend | packs/reverse-engineering/rules/every-law-has-a-source.md | one tag list (DS, REF, EMU, SVC, DER, PHOTO, ASSUMED, MEAS); COR weak; host-only law provisional; chip vs board; same button name | text in place; rule loads as before | 3c7f57c | done |
| E1.4 | extend | packs/reverse-engineering/rules/every-law-has-a-source.md | one tag list (DS, REF, EMU, SVC, DER, PHOTO, ASSUMED, MEAS); COR weak; host-only law provisional; chip vs board; same button name | text in place; rule loads as before | 3c7f57c | done |
| E1.5 | extend | packs/reverse-engineering/rules/every-law-has-a-source.md | one tag list (DS, REF, EMU, SVC, DER, PHOTO, ASSUMED, MEAS); COR weak; host-only law provisional; chip vs board; same button name | text in place; rule loads as before | 3c7f57c | done |
| E1.6 | dropped | packs/reverse-engineering/checks/ear-constant-tagged.json untouched | the check reading the full tag list | none | - | dropped (SORTED.md section 3: "Drop. The check does its one job now.") |
| E2.1 | extend | packs/reverse-engineering/rules/two-sources-before-naming.md | a test is a source; scope; translation; trimmer pair; firmware first; sibling enums; arithmetic arbiter; C11 closure | text in place | 3c7f57c | done |
| E2.2 | extend | packs/reverse-engineering/rules/two-sources-before-naming.md | a test is a source; scope; translation; trimmer pair; firmware first; sibling enums; arithmetic arbiter; C11 closure | text in place | 3c7f57c | done |
| E2.3 | extend | packs/reverse-engineering/rules/two-sources-before-naming.md | a test is a source; scope; translation; trimmer pair; firmware first; sibling enums; arithmetic arbiter; C11 closure | text in place | 3c7f57c | done |
| E2.4 | extend | packs/reverse-engineering/rules/two-sources-before-naming.md | a test is a source; scope; translation; trimmer pair; firmware first; sibling enums; arithmetic arbiter; C11 closure | text in place | 3c7f57c | done |
| E2.5 | extend | packs/reverse-engineering/rules/two-sources-before-naming.md | a test is a source; scope; translation; trimmer pair; firmware first; sibling enums; arithmetic arbiter; C11 closure | text in place | 3c7f57c | done |
| E2.6 | extend | packs/reverse-engineering/rules/two-sources-before-naming.md | a test is a source; scope; translation; trimmer pair; firmware first; sibling enums; arithmetic arbiter; C11 closure | text in place | 3c7f57c | done |
| E2.7 | extend | packs/reverse-engineering/rules/two-sources-before-naming.md | a test is a source; scope; translation; trimmer pair; firmware first; sibling enums; arithmetic arbiter; C11 closure | text in place | 3c7f57c | done |
| E2.8 | extend | packs/reverse-engineering/rules/two-sources-before-naming.md | a test is a source; scope; translation; trimmer pair; firmware first; sibling enums; arithmetic arbiter; C11 closure | text in place | 3c7f57c | done |
| E3.1 | extend | packs/reverse-engineering/rules/a-negative-names-what-was-scanned.md | every encoding and stride; change the question after three; tool layout printed; analogy checked | text in place | 3c7f57c | done |
| E3.2 | extend | packs/reverse-engineering/rules/a-negative-names-what-was-scanned.md | every encoding and stride; change the question after three; tool layout printed; analogy checked | text in place | 3c7f57c | done |
| E3.3 | extend | packs/reverse-engineering/rules/a-negative-names-what-was-scanned.md | every encoding and stride; change the question after three; tool layout printed; analogy checked | text in place | 3c7f57c | done |
| E3.4 | extend | packs/reverse-engineering/rules/a-negative-names-what-was-scanned.md | every encoding and stride; change the question after three; tool layout printed; analogy checked | text in place | 3c7f57c | done |
| E4.1 | extend | packs/reverse-engineering/rules/addresses-name-their-space.md | image name, version, md5; grid filter; decompressed offsets | text in place | 3c7f57c | done |
| E4.2 | extend | packs/reverse-engineering/rules/addresses-name-their-space.md | image name, version, md5; grid filter; decompressed offsets | text in place | 3c7f57c | done |
| E4.3 | extend | packs/reverse-engineering/rules/addresses-name-their-space.md | image name, version, md5; grid filter; decompressed offsets | text in place | 3c7f57c | done |
| E5.1 | extend | packs/reverse-engineering/rules/findings-are-withdrawn-in-place.md | a comment is no evidence; a correction asserted in the tool | text in place | 3c7f57c | done |
| E5.2 | extend | packs/reverse-engineering/rules/findings-are-withdrawn-in-place.md | a comment is no evidence; a correction asserted in the tool | text in place | 3c7f57c | done |
| E6.1 | extend, reworded | packs/reverse-engineering/rules/reproduction-or-original.md | the anomaly kept as the machine has it, footnoted, tested; no switch | text in place | 3c7f57c | done |
| E6.2 | extend, reworded | packs/reverse-engineering/rules/reproduction-or-original.md | extra faceplate controls go to our edit layer, labelled ours | text in place | 3c7f57c | done |
| E6.3 | extend | packs/reverse-engineering/rules/reproduction-or-original.md | no patch memory: the record is ours; variants as one engine and a range table | text in place | 3c7f57c | done |
| E6.4 | extend | packs/reverse-engineering/rules/reproduction-or-original.md | no patch memory: the record is ours; variants as one engine and a range table | text in place | 3c7f57c | done |
| E7.1 | extend | packs/reverse-engineering/rules/account-every-term.md | named term fields; the firmware's domain; the two-input VCA route | text in place | 3c7f57c | done |
| E7.2 | extend | packs/reverse-engineering/rules/account-every-term.md | named term fields; the firmware's domain; the two-input VCA route | text in place | 3c7f57c | done |
| E7.3 | extend | packs/reverse-engineering/rules/account-every-term.md | named term fields; the firmware's domain; the two-input VCA route | text in place | 3c7f57c | done |
| E8.1 | extend | packs/reverse-engineering/skills/names-first + tools/lib/names-runs.mts (--run) | width-prefixed tables count themselves | test/tools/reverse-engineering/names-modes.test.mts | 3c7f57c | done |
| E8.2 | extend | packs/reverse-engineering/skills/names-first/sweeps.md | keyword and units net; the word stream | text in place; names-modes.test.mts (24-bit) | 3c7f57c | done |
| E8.3 | extend | packs/reverse-engineering/skills/names-first/sweeps.md | keyword and units net; the word stream | text in place; names-modes.test.mts (24-bit) | 3c7f57c | done |
| E8.4 | extend | packs/reverse-engineering/skills/names-first + tools/lib/names-index.mts (--index) | name-to-index scored against shifted, strided and shuffled controls | test/tools/reverse-engineering/names-modes.test.mts | 3c7f57c | done |
| E8.5 | extend | packs/reverse-engineering/skills/names-first step 16 | a missing string read against the panel | text in place | 3c7f57c | done |
| E8.6 | extend | packs/reverse-engineering/skills/names-first/sweeps.md | suffix lists | text in place | 3c7f57c | done |
| E8.7 | extend | packs/reverse-engineering/skills/names-first step 16 | generated name fields | text in place | 3c7f57c | done |
| E8.8 | extend | packs/reverse-engineering/skills/names-first/sweeps.md | loader messages; character table; the effect's vocabulary | text in place | 3c7f57c | done |
| E8.9 | extend | packs/reverse-engineering/skills/names-first/sweeps.md | loader messages; character table; the effect's vocabulary | text in place | 3c7f57c | done |
| E8.10 | extend | packs/reverse-engineering/skills/names-first/sweeps.md | loader messages; character table; the effect's vocabulary | text in place | 3c7f57c | done |
| E8.11 | extend, decided (C10) | packs/reverse-engineering/skills/names-first Never | a panel table's columns read, not assumed | text in place | 3c7f57c | done |
| E9.1 | extend | packs/reverse-engineering/skills/gather-sources step 1 + tools/source-ledger.mts (--hash) | hash pass against held and sibling folders; part number first | test/tools/reverse-engineering/source-ledger.test.mts | 3c7f57c | done |
| E9.2 | extend | packs/reverse-engineering/skills/gather-sources/source-kinds.md | updater; factory sounds' homes; boot media | text in place | 3c7f57c | done |
| E9.3 | extend | packs/reverse-engineering/skills/gather-sources/source-kinds.md | updater; factory sounds' homes; boot media | text in place | 3c7f57c | done |
| E9.4 | extend | packs/reverse-engineering/skills/gather-sources/source-kinds.md | updater; factory sounds' homes; boot media | text in place | 3c7f57c | done |
| E9.5 | extend, reworded | packs/reverse-engineering/skills/gather-sources step 4 | in the service manual, read the parts list first | text in place | 3c7f57c | done |
| E9.6 | extend | packs/reverse-engineering/skills/gather-sources step 13 | the OS version of every manual and image | text in place | 3c7f57c | done |
| E9.7 | extend | packs/reverse-engineering/skills/gather-sources/source-kinds.md | editor templates; patents and designers; supplier spec; artwork; site list | text in place | 3c7f57c | done |
| E9.8 | extend | packs/reverse-engineering/skills/gather-sources/source-kinds.md | editor templates; patents and designers; supplier spec; artwork; site list | text in place | 3c7f57c | done |
| E9.9 | extend | packs/reverse-engineering/skills/gather-sources/source-kinds.md | editor templates; patents and designers; supplier spec; artwork; site list | text in place | 3c7f57c | done |
| E9.10 | extend | packs/reverse-engineering/skills/gather-sources/source-kinds.md | editor templates; patents and designers; supplier spec; artwork; site list | text in place | 3c7f57c | done |
| E9.11 | extend | packs/reverse-engineering/skills/gather-sources/source-kinds.md | editor templates; patents and designers; supplier spec; artwork; site list | text in place | 3c7f57c | done |
| E9.12 | extend | packs/reverse-engineering/skills/gather-sources step 14 | write back to the archive | text in place | 3c7f57c | done |
| E9.13 | extend, reworded | packs/reverse-engineering/skills/gather-sources step 9 | a graticule photo may give a time; a redrawn trace ratios only | text in place | 3c7f57c | done |
| E9.14 | extend, reworded | packs/reverse-engineering/skills/gather-sources step 11 | no dump: say so, stop looking, go on | text in place | 3c7f57c | done |
| E10.1 | extend | packs/reverse-engineering/skills/re-deliverables | histogram, repro commands, confidence column; day-one list; predictions | text in place | 3c7f57c | done |
| E10.2 | extend | packs/reverse-engineering/skills/re-deliverables | histogram, repro commands, confidence column; day-one list; predictions | text in place | 3c7f57c | done |
| E10.3 | extend | packs/reverse-engineering/skills/re-deliverables | histogram, repro commands, confidence column; day-one list; predictions | text in place | 3c7f57c | done |
| E11.1 | extend | packs/reverse-engineering/skills/bank-census | count per filter mode; rerun after an EAR constant | text in place | 3c7f57c | done |
| E11.2 | extend | packs/reverse-engineering/skills/bank-census | count per filter mode; rerun after an EAR constant | text in place | 3c7f57c | done |
| E11.3 | extend, decided (C17) | packs/reverse-engineering/skills/bank-census | a flat column: wrong decode or fixed structure | text in place | 3c7f57c | done |
| E11.4 | extend | packs/reverse-engineering/skills/bank-census | per-feature corpus counts as regression tests | text in place | 3c7f57c | done |
| E12.1 | extend | packs/reverse-engineering/skills/re-toolchain + family-traps.md, install-recipes.md | trap list per tool; seeded descent; install recipes; the interpreter in the library | text in place | 3c7f57c | done |
| E12.2 | extend | packs/reverse-engineering/skills/re-toolchain + family-traps.md, install-recipes.md | trap list per tool; seeded descent; install recipes; the interpreter in the library | text in place | 3c7f57c | done |
| E12.3 | extend | packs/reverse-engineering/skills/re-toolchain + family-traps.md, install-recipes.md | trap list per tool; seeded descent; install recipes; the interpreter in the library | text in place | 3c7f57c | done |
| E12.4 | extend | packs/reverse-engineering/skills/re-toolchain + family-traps.md, install-recipes.md | trap list per tool; seeded descent; install recipes; the interpreter in the library | text in place | 3c7f57c | done |
| E13.1 | extend, decided (C4) | packs/reverse-engineering/rules/house-tools-live-in-the-library.md | nothing ported; unidasm a black box | text in place | 3c7f57c | done |
| E13.2 | extend | packs/reverse-engineering/rules/house-tools-live-in-the-library.md | measure a tool the second time; refuse loudly | text in place | 3c7f57c | done |
| E14.1 | extend | packs/reverse-engineering/skills/read-a-circuit-diagram step 9 | parts list beats the diagram; revision diff; topology predicts; tolerance as intent; CV tap | text in place | 3c7f57c | done |
| E14.2 | extend | packs/reverse-engineering/skills/read-a-circuit-diagram step 9 | parts list beats the diagram; revision diff; topology predicts; tolerance as intent; CV tap | text in place | 3c7f57c | done |
| E14.3 | extend | packs/reverse-engineering/skills/read-a-circuit-diagram step 9 | parts list beats the diagram; revision diff; topology predicts; tolerance as intent; CV tap | text in place | 3c7f57c | done |
| E14.4 | extend | packs/reverse-engineering/skills/read-a-circuit-diagram step 9 | parts list beats the diagram; revision diff; topology predicts; tolerance as intent; CV tap | text in place | 3c7f57c | done |
| E14.5 | extend | packs/reverse-engineering/skills/read-a-circuit-diagram step 9 | parts list beats the diagram; revision diff; topology predicts; tolerance as intent; CV tap | text in place | 3c7f57c | done |
| E15 | extend | packs/reverse-engineering/skills/gather-sources/datasheet-sources.md | per-chip function and table kind; the family manual | text in place | 3c7f57c | done |
| E16 | extend | packs/reverse-engineering/skills/menu-map step 1 | the calibration menu before the tuning table | text in place | 3c7f57c | done |
| E17 | extend | packs/reverse-engineering/skills/tripwire-the-law step 6 | the fix order | text in place | 3c7f57c | done |
| E18 | extend | packs/reverse-engineering/tools/lib/unwrap.mts + unwrap-proofs.mts | new unwrap modes, existing modes untouched | test/tools/reverse-engineering/names-modes.test.mts (red with the SMF mode removed) | 3c7f57c | done |
| E19.1 | | | | | | |
| E19.2 | | | | | | |
| E19.3 | | | | | | |
| E19.4 | | | | | | |
| E19.5 | | | | | | |
| E19.6 | | | | | | |
| E19.7 | | | | | | |
| E19.8 | | | | | | |
| E20.1 | | | | | | |
| E20.2 | | | | | | |
| E20.3 | | | | | | |
| E20.4 | | | | | | |
| E20.5 | | | | | | |
| E21.1 | | | | | | |
| E21.2 | | | | | | |
| E21.3 | | | | | | |
| E21.4 | | | | | | |
| E21.5 | | | | | | |
| E21.6 | | | | | | |
| E22.1 | | | | | | |
| E22.2 | | | | | | |
| E22.3 | | | | | | |
| E23.1 | | | | | | |
| E23.2 | | | | | | |
| E23.3 | | | | | | |
| E24.1 | | | | | | |
| E24.2 | | | | | | |
| E25 | | | | | | |
| E26.1 | | | | | | |
| E26.2 | | | | | | |
| E26.3 | | | | | | |
| E27 | | | | | | |
| E28 | | | | | | |
| E29 | | | | | | |
| E30.1 | | | | | | |
| E30.2 | | | | | | |
| E30.3 | | | | | | |
| E30.4 | | | | | | |
| E31.1 | | | | | | |
| E31.2 | | | | | | |
| E32.1 | | | | | | |
| E32.2 | | | | | | |
| E32.3 | | | | | | |
| E33 | | | | | | |
| E34 | | | | | | |
| E35 | | | | | | |
| E36 | | | | | | |
| E37.1 | | | | | | |
| E37.2 | | | | | | |
| E37.3 | | | | | | |
| E37.4 | | | | | | |
| E37.5 | | | | | | |
| E37.6 | | | | | | |
| E37.7 | | | | | | |
| E37.8 | | | | | | |
| E37.9 | | | | | | |
| E38.1 | | | | | | |
| E38.2 | | | | | | |
| E38.3 | | | | | | |
| E38.4 | | | | | | |
| E38.5 | | | | | | |
| E38.6 | | | | | | |
| E38.7 | | | | | | |
| E39.1 | | | | | | |
| E39.2 | | | | | | |
| E39.3 | | | | | | |
| E39.4 | | | | | | |
| E39.5 | | | | | | |
| E39.6 | | | | | | |
| E40.1 | | | | | | |
| E40.2 | | | | | | |
| E40.3 | | | | | | |
| E40.4 | | | | | | |
| E40.5 | | | | | | |
| E41.1 | | | | | | |
| E41.2 | | | | | | |
| E42.1 | | | | | | |
| E42.2 | | | | | | |
| E42.3 | | | | | | |
| E42.4 | | | | | | |
| E42.5 | | | | | | |
| E43 | | | | | | |
| E44.1 | | | | | | |
| E44.2 | | | | | | |
| E45 | | | | | | |
| E46.1 | | | | | | |
| E46.2 | | | | | | |
| E46.3 | | | | | | |
| E46.4 | | | | | | |
| E47.1 | | | | | | |
| E47.2 | | | | | | |
| E47.3 | | | | | | |
| E48 | | | | | | |
| E49.1 | | | | | | |
| E49.2 | | | | | | |
| E50.1 | | | | | | |
| E50.2 | | | | | | |
| E50.3 | | | | | | |
| E50.4 | | | | | | |
| E50.5 | | | | | | |
| E50.6 | | | | | | |
| E50.7 | | | | | | |
| E50.8 | | | | | | |
| E51.1a | | | | | | |
| E51.1b | | | | | | |
| E51.2a | | | | | | |
| E51.2b | | | | | | |
| E51.2c | | | | | | |
| E51.3 | | | | | | |
| E51.4 | | | | | | |
| E52.1 | | | | | | |
| E52.2 | | | | | | |
| E53.1 | | | | | | |
| E53.2 | | | | | | |
| E53.3 | | | | | | |
| E53.4 | | | | | | |
| E54.1 | | | | | | |
| E54.2 | | | | | | |
| E55.1 | | | | | | |
| E55.2 | | | | | | |
| E56 | | | | | | |
| E57 | | | | | | |
| E58.1 | | | | | | |
| E58.2 | | | | | | |
| E58.3 | | | | | | |
| E58.4 | | | | | | |
| E58.5 | | | | | | |
| E59 | | | | | | |
| E60.1 | | | | | | |
| E60.2 | | | | | | |
| E61.1 | | | | | | |
| E61.2 | | | | | | |
| E62.1 | | | | | | |
| E62.2a | | | | | | |
| E62.2b | | | | | | |
| E62.3 | | | | | | |
| E63.1 | | | | | | |
| E63.2 | | | | | | |
| E63.3 | | | | | | |
| E63.4 | | | | | | |
| E64 | | | | | | |
| E65.1 | | | | | | |
| E65.2 | | | | | | |
| E65.3 | | | | | | |
| E66.1 | | | | | | |
| E66.2 | | | | | | |
| E66.3 | | | | | | |
| E67 | | | | | | |
| E68.1 | | | | | | |
| E68.2 | | | | | | |
| E69 | | | | | | |
| E70.1 | | | | | | |
| E70.2 | | | | | | |
| E70.3 | | | | | | |
| E70.4 | | | | | | |
| E71 | | | | | | |
| E72.1 | | | | | | |
| E72.2 | | | | | | |
| E73 | | | | | | |
| E74.1 | | | | | | |
| E74.2 | | | | | | |
| E75 | | | | | | |
| E76 | | | | | | |
| E77 | | | | | | |
| E78.1 | | | | | | |
| E78.2 | | | | | | |
| E78.3 | | | | | | |
| E78.4 | | | | | | |
| E78.5 | | | | | | |
| E79 | | | | | | |
| E80 | | | | | | |
| T1 | | | | | | |
| T2 | | | | | | |
| T3 | | | | | | |
| T4 | | | | | | |
| T5 | | | | | | |
| T6 | | | | | | |
| T7 | | | | | | |
| T8 | | | | | | |
| T9 | | | | | | |
| T10 | | | | | | |
| T11 | | | | | | |
| D1 | | | | | | |
| D2 | | | | | | |
| D3 | | | | | | |
| O20 | | | | | | |
| O30 | | | | | | |
| L1 | | | | | | |
| L2 | | | | | | |
| S1 | | | | | | |
