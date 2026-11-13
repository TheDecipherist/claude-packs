# sd-a report (W4, sound-design, U32-U38, U40, U41)

| id | new or extend | pack and file | one thing | proof |
|---|---|---|---|---|
| U32 | new | sound-design/skills/measure-a-filter | corner, slope, resonance from renders | pressure test |
| U33 | new | sound-design/skills/measure-an-envelope | stages and onset from renders | pressure test |
| U34 | new | sound-design/skills/identify-a-parameter | unknown byte by audible signature | pressure test |
| U35 | new | sound-design/skills/prove-choices-differ | N x N difference of a choice's options | pressure test |
| U36 | new | sound-design/skills/bank-coverage + tools/bank-coverage.mts | every control varied or exempt | test/tools/sound-design/bank-coverage.test.mts (planted flat control seen red with the plant removed) |
| U36 split | extend | midi/rules/imports-count-every-loss.md (one bullet); sound-design/skills/spread-probe (step 6, held middle C) | | pack-content |
| U37 | new | sound-design/rules/full-matrix-first (+ U41's per-voice/bank line) | whole matrix | paths |
| U38 | new | sound-design/rules/reset-before-apply + checks/reset-before-apply.json | reset as find-the-reset's map | check bad/good verified by regex; measured on solera |
| U40 | new | sound-design/rules/reference-presets-are-statistics-only | aggregates only | paths |
| U41 | new | sound-design/rules/model-the-mechanism (trimmed) | the machine's mechanism | paths |

Check measured on ~/projects/solera/Source/PluginProcessor.cpp: 2 hits. setCurrentProgram resets inline in a loop (no call named reset), so the check flags it; loadAllPatches is a file loader, not an apply. Choice kept: a reset must be a call named reset*, first in the body.

## Skill scenarios
- measure-a-filter fire: a rebuilt ladder filter's slope reads 27 dB/oct against the machine's 24; saw renders at five cutoffs. Near miss: fitting a delay-time law (measure-a-law). Followed: divides by the open render, skips the fundamental, subtracts the 3 dB/oct tilt, checks the open render is not the clamped max, marks unresolved Q rows NOT MEASURED.
- measure-an-envelope fire: an attack reads 4 ms from peak time on a soft pad. Near miss: a filter's corner (measure-a-filter). Followed: 20 ms frames, half-sustained crossing, centroid for the filter envelope, softest-note test.
- identify-a-parameter fire: an unknown byte 0x1F in a dump. Near miss: naming a byte from a manual table. Followed: sweeps 0..127, computes flatness, tries 0-3 if inert, finds neutral of a bipolar one, tags [EMU].
- prove-choices-differ fire: a 6-option waveform selector added. Near miss: bank spread (spread-probe). Followed: renders six, 6x6 difference, names a nulling pair.
- bank-coverage fire: a 292-patch bank just generated. Near miss: do the programs sound alike (spread-probe). Followed: writes bank.json with needs fields, runs the tool, fixes flat controls or writes reasons.

## Rules: files governed
full-matrix-first, reset-before-apply, model-the-mechanism: engine code (cpp, js, python, tooling). reference-presets-are-statistics-only: preset-files, python, tooling.

## Faults
None. No refusals. Ratchet unchanged.
