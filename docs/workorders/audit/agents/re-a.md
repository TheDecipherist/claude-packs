# re-a report (W1, items 6)

| id | new or extend | pack and file | its one thing | proof |
|---|---|---|---|---|
| U1 | new | reverse-engineering: skills/triage-the-dump, tools/dump-triage.mts | say what each image is and whether it is whole | test/tools/reverse-engineering/dump-triage.test.mts (stuck-line plant seen red once with the plant removed) |
| U2 | new | reverse-engineering: skills/identify-the-cpu | name each processor, proved three ways | pressure test |
| U3 | new | reverse-engineering: rules/decode-from-a-proven-boundary.md | a listing counts only from a reached address | paths |
| U4 | new | reverse-engineering: skills/find-the-base | prove the load base by a score with margin (linear read only, C13) | pressure test |
| U5 | new | reverse-engineering: skills/trace-the-builders (+ c-idioms.md) | read every field-to-coefficient routine | pressure test |
| W1.2 | extend | reverse-engineering: skills/re-toolchain step 1 | names processors from identify-the-cpu's proved answer | pressure test |

U3 governs notes, tooling, cpp and js files (same concepts as `addresses-name-their-space`).

## Scenarios
- triage-the-dump fire: a 128 KB EPROM dump arrives; 64 KB of it repeats and A5 looks stuck. Near miss: find parameter names in an already triaged image (names-first).
  Followed run: runs the tool, reads period and stuck line, records the over-read, writes a line per image, then starts names-first.
- identify-the-cpu fire: a board photo says "Hitachi" and the image has a vector table; a disassembler is to be chosen. Near miss: choose a disassembler for an already proved H8 (re-toolchain).
  Followed run: signature, opcode census with a control, a third proof, confidence, writes the answer for re-toolchain.
- find-the-base fire: a 32 KB ROM whose jump targets do not line up. Near miss: decoding a table once the base is known.
  Followed run: scores bases on a linear read, records the margin, says why not recursive descent.
- trace-the-builders fire: a preset record's byte 12 must become a filter cutoff. Near miss: a bank census of values (bank-census).
  Followed run: lists call sites, finds shared helpers, traces RESTORE, reproduces anchors unfitted.

## Faults
template-law refused my first write of dump-triage.mts (its closing print block matched source-ledger.mts main). A trivial print; I printed once through one join. No refusal id was shown, so none marked.
