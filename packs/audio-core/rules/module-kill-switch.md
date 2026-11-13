---
# concepts: ui, dsp, panel-spec
paths:
  - "placeholder"
---

# A module's ON lamp is a kill switch, every module ships off, and a bypass is the whole unit

<constraints>
Always do:
- Make a module's header lamp its kill switch: with it off, the output is bit-identical to the module not being there, whatever its controls say. Prove it with a null test.
- Ship every module off in INIT.
- Make BYPASS the whole unit.
- Run stacked notes (DOUBLE, TRIPLE, a fifth) through the same engine and the same output as the played note, spending ordinary polyphony and stealing like any note.
- Pin a hidden control's parameter to its neutral value: read the stored value and override it where it is used, never write the pin over it, so showing the control again finds the user's value.
- Pass the input through under BYPASS: the unit's output is its input, not silence.
- Show the voice counter as the multiplied figure (notes times stacked voices), the number the engine runs.

Never do:
- Ship a knob with no parameter behind it: it is a dead knob.
- Route a stacked note around the filter or the effects, or onto its own bus.
- Mask a hidden control while its parameter still moves the sound.
</constraints>
