---
name: new-panel-control
description: Use when adding a control to a panel or page, or changing what an existing control does. Also /new-panel-control.
---

# Add a panel control

1. **Use the shared piece.** Find the shared control component (knob, slider, switch, segmented button, handle) and place it. Never draw a control by hand.
2. **Parameter.** Append the parameter at the end of the parameter table, with a new id that never changes (`parameter-ids-never-change`). Never insert, never reuse an id.
3. **Wire all three links.** Drawn (on the page), bound (the control moves the parameter, and the parameter moves the control), carried (the sound changes). Check each one with `prove-control`.
4. **House behaviours.** Double click to default, fine drag, wheel, value readout, no keyboard focus, one undo step (`house-control-behaviours`).
5. **Look.** Match the page's reference: the control's parts, value placement and spacing (`ui-matches-reference-look`).
6. **Gates.** Run the behaviour gate, the look gate and the silent-control gate. Each must pass and must still fail on its planted fault.

Report: the parameter id, and the evidence from each step as command plus result.
