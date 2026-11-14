---
# concepts: dsp, params, ui
paths:
  - "placeholder"
---

# A value the user sees and the sound uses comes from one formula

<constraints>
Always do:
- Put each mapping (normalized value to Hz, dB, ms, ratio, semitones, note name, tempo-synced time) in one function, and call that same function from the DSP, the display text and the host's value-to-text.
- When a mapping changes, change it in that one place, and add a test that checks DSP and display agree at the ends and in the middle of the range.
- Convert each unit between an imported or shared component and the engine's 0..1 ids in one adapter, declared once; when callers disagree, fix the unit before refitting any law.

Never do:
- Re-derive a display value in the editor ("cutoff = 20 * pow(1000, v)") next to a different formula in the DSP.
- Round or clamp differently in the display than in the sound.
</constraints>

## Check
`trace-parameter` reports any second formula it finds for the same value.
