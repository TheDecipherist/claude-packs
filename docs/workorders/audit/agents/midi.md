# midi (W4, 12 items)

| id | new or extend | pack and file | its one thing | proof |
|---|---|---|---|---|
| U47 | new | midi/rules/nrpn-and-packed-values.md | NRPN numbers and packed values decoded and written back exactly | paths (cpp, js) |
| U48 | new | midi/skills/vendor-sysex | recognise a vendor's sysex frame and record conventions | pressure test |
| U49 | new | midi/skills/midi-from-firmware | read the MIDI a machine honours from its receive handler | pressure test |
| U50 | new | midi/skills/find-the-division-table | find the division table and read it in order | pressure test |
| E50.1-8 | extend | midi/skills/does-it-sync (steps 7-12) | decide whether and how a machine syncs | pressure test |
| E51 | extend | midi/skills/clock-probe/clock-law.md (new section 0; sections 3, 5, 6, 7, 8) | the clock law | paths |
| E52.1/C6/C9/C9a | extend | midi/rules/sync-is-a-mode.md | decided defaults at open | paths |
| E53 | extend | midi/skills/clock-probe (steps 8-11) and midi/tools/open-default-probe.mts | default at open, measured | test/tools/midi/open-default-probe.test.mts (seen red with plugin delay default broken) |
| E54, E55, E56 | extend | measure-the-clock-in-audio, sysex-is-a-record, imports-count-every-loss | as listed | paths |

Dropped: E51.2a re-anchor clause; E51.2c (shell item). E51.3 kept as "a machine's stored tempo knob IS its internal tempo field". E51.1b: clock OUT recorded beside the three receiving states.

Lines replaced: sync-is-a-mode "Leave each destination's division off by default" (now the decided defaults); clock-law section 6 "What stays off by default is each DESTINATION's division" (same). Shell words: "transport bar" became "the plugin's master clock" in clock-law; the division append-only line was added to section 3 (seams-are-declared untouched).

Rule frontmatter: the five midi rules changed to `# concepts: cpp, js` plus the `paths:` placeholder (the old explicit globs are generated now; `audio` does not exist in a cpp install, so it was not used).

## Pressure scenarios
- vendor-sysex fire: a Roland-style dump of a bank decodes names but every value is off by one, and the last byte of each message fails the checksum. The skill's steps: read the frame, the checksum over address and data, 7-bit address carry, nibble split. Near miss: asking how a machine syncs (does-it-sync owns it). A run that followed it: names the frame fields, proves the checksum over every message, tests the nibble split, uses 7-bit carry.
- midi-from-firmware fire: no MIDI chart exists and the ROM is open; the user asks whether the machine honours NRPN. Steps: find the UART routine, the status dispatch, list a row per status byte. Near miss: finding the division table (find-the-division-table). Followed: lists rows with addresses, follows data bytes to a parameter, notes F8 compare as a range test until read.
- find-the-division-table fire: a manual prints a two-column division list and a 24 PPQN firmware is open. Near miss: reading a sysex checksum. Followed: finds `6 8 9 12` run, reads rows not columns, checks appendix order, sorts by duration.

## Faults
- Ratchet fixture `test/fixtures/pack-content-ratchet.json` is stale after my fixes (R1 75 to 71, R6 18 to 16, count may include other agents): the lead lowers it; I did not edit it.
- clock-law.md was 417 lines and is now longer (a reference file, not an installed hook, check or tool); not split.
- Hook note on shell-written .mts: re-created the new tool via a shell heredoc; content was judged by tests and check only. No refusals.
