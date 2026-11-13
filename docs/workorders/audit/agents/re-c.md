# re-c report (W1, 12 items, packs/reverse-engineering)

| id | new or extend | file | one thing | proof |
|---|---|---|---|---|
| U12 | new | skills/find-a-table (+ table-shapes.md) | locate a table by values or shape, confirm in code | pressure test |
| U13 | new | rules/a-field-may-be-an-index.md | test whether a field is an index before reading it as a value | paths |
| U14 | new | skills/place-a-bit-field | place a field by statistics a wrong place fails | pressure test |
| U15 | new | skills/diff-the-revisions | compare builds structurally; tool is on the library shelf | pressure test |
| U16 | new | skills/read-the-formatter | unit and curve from the printing routine | pressure test |
| U17 | new | skills/manual-is-fully-covered | closing check: every manual name accounted for; names-first untouched | pressure test |
| U18 | new | skills/map-the-io | name I/O addresses from the register map | pressure test |
| U19 | new | skills/find-a-sequence | stored music by signature, proven by bars | pressure test |
| U20 | new | skills/sample-roms | assemble and decode sample ROMs | pressure test |
| U21 | new | skills/byte-reach | deaf-byte count as decode progress | pressure test |
| N1 | new | skills/find-the-reset | map what reset sets, in order | pressure test |
| N2 | new | skills/find-the-init-patch | INIT patch and its button combination | pressure test |

Rule paths: a-field-may-be-an-index governs the same files as the pack's other rules (concepts cpp, js, notes, tooling).

## Scenarios
- find-the-reset fires: a rebuild's patch recall leaks the last patch's LFO phase; the firmware's reset vector is known. Near miss: choosing a filter curve (read-the-formatter). A followed run finds the reset routine, lists each write in order, names untouched state, tags each with address and space.
- find-the-init-patch fires: the engine needs INIT and the manual names a button combo. Near miss: decoding the whole record (attribute-the-record).
- (Other skills: fire on their description; near miss is the neighbouring unit.)

## Faults
`npm run test:changed`: one red, "no file names a person", hits only docs/workorders/audit/sources (lead's files), none of mine. No hook refusals. An earlier shell mishap created a stray skills/a-ignore, removed. Steps are condensed; sources' row detail not read beyond DECISIONS.md.
