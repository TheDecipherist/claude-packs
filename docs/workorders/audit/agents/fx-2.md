# fx-2 (W9): re-midi.md

| # | result |
|---|---|
| 1 | fixed: `<< 7`, `<< 8` only for a chart that packs a whole byte (checked: 7-bit bytes) |
| 2 | fixed: step 12 says `dump-triage` does not print the column (tool unchanged; the tool is another fixer's) |
| 3 | fixed: "from the corpus alone", 40 marked a rule of thumb, code-named bytes need no count |
| 4 | fixed: 6502 reset at 0xFFFC, 6809 at 0xFFFE (6502 0xFFFE is IRQ/BRK) |
| 5 | fixed: one list in the rule, with `[DATA] [REF <model>] [PHOTO?] [REPAIR] [DS-REF]` added; `prompts/workorder/templates/rebuild.md` points to it (outside the pack: the noop pin may need the lead's counts run); boards-from-photos already uses these tags and adds none |
| 6 | fixed: one hit is a lead |
| 7 | fixed: both lines carry the not-tuned qualifier |
| 8 | fixed: second source only on programs not used to choose the mapping |
| 9 | fixed: 96 ticks per 4/4 bar at 24 PPQN (verified), 384 for four bars |
| 10 | fixed: mode 3 period is the full count; both-edge interrupt sees the half (datasheet page not cited: no datasheet at hand) |
| 11 | fixed: layout's range, 7-bit for sysex-derived records |
| 12 | fixed: source-kinds and boards-from-photos now agree (ManualsLib for title and date, file fetched elsewhere) |
| 13 | fixed: 256 is Roland's limit, 245 the safe margin |
| 14 | fixed: "as the hardware did (standalone, sync off, on almost all of them)" |
| 15 | step 8 fixed (pointer to find-the-init-patch); left: moving steps 9, 10 to a new skill is a restructure beyond a line or two |
| 16 | left: splitting five skills into main job plus further-reads is large; style |
| 17 | fixed: map-the-io step 7 points to read-a-fuse-map |
| 18 | fixed: the "offsets come from the code" sentence restored; step 14 moved to `sweeps.md` (SKILL.md now 7.5 KB); steps renumbered. Cost note not restored (not found in the wording seen) |
| 19 | fixed: midi-from-firmware step 6 points to does-it-sync step 7 |

Tests: pack-content, repo-lint green (45 pass). Ratchet file untouched.
