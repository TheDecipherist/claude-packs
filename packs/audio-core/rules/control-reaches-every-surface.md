---
# concepts: params, ui
paths:
  - "placeholder"
---

# A new or changed control is proven at every surface it has

<constraints>
Always do:
- For every control you add or change, prove each surface it has with a real invocation, not a unit call:
  1. host automation: set the parameter by its ID, render, and the sound changes;
  2. the editor widget moves the same parameter, and shows the value the host set;
  3. patch save and load round-trips the exact value;
  4. the init patch and the reset value match the spec;
  5. MIDI CC or learn, if the control has one;
  6. undo restores it, as one step per gesture.
- Record the evidence for each surface in the step or bug log (command plus result). Use the `prove-control` skill.

Never do:
- Call a control done because the DSP function passes its unit test. "The function works" and "the knob reaches the function" are different claims.
- Add a control that exists in the editor but not in the parameter tree, or the other way round, unless the spec says it's performance-only.
</constraints>
