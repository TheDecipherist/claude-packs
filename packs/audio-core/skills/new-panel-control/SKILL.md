---
name: new-panel-control
description: Use when adding a control to a panel or page, or changing what an existing control does. Also /new-panel-control.
---

# Add a panel control (one job: a control that is shared, wired, house-behaved and proved)

<constraints>
Always do:
1. **Use the shared piece.** Find the shared control component (knob, slider, switch, segmented button, handle) and place it. Never draw a control by hand.
2. **Its state indicator, decided with its kind** (the user, 2026-11-13, after the Supernova II's buttons turned out to light red in the centre when on). When you decide what kind of control it is, decide too whether it shows its state, and how: an LED in it or beside it (its colour, its place, lit and unlit), a ring or arc of LEDs, a lit legend, a pointer only, a value on the display, or nothing. Read it from the reference and the manual; a photo shows only the states it caught, so look for one with the light on. Where neither settles it, ask the user; with nobody there, take what the unit's photos show and mark it unconfirmed. Write it in the control's table row as `indicator`: its kind, colour, its states (off, on, flashing, dimmed) and what drives each (the parameter, a radio group, a mode, the firmware's LED map). The shared piece draws every state, and `prove-control` proves the light follows the state through the control's own input path.
3. **Parameter.** Append the parameter at the end of the parameter table, with a new id that never changes (`parameter-ids-never-change`). Never insert, never reuse an id.
4. **Wire all three links.** Drawn (on the page), bound (the control moves the parameter, and the parameter moves the control), carried (the sound changes). Check each one with `prove-control`.
5. **House behaviours.** Double click to default, fine drag, wheel, value readout, no keyboard focus, one undo step (`house-control-behaviours`).
6. **Look.** Match the page's reference: the control's parts, value placement and spacing (`page-matches-reference-look`).
7. **Gates.** Run the behaviour gate, the look gate and the silent-control gate. Each must pass and must still fail on its planted fault.

8. **State and hover gates** (`editor-paints-what-changed`). Where the control is an on/off (a switch, a bypass, a power, a mute) or sits in a container with a hover:
   - Apply what the switch governs in one function (`setLit (bool)`) that sets each governed component and repaints exactly those. Never in a `paint` (`no-state-change-in-paint`).
   - Decide a container's hover with `isMouseOver (true)` or `addMouseListener (this, true)`, never from its own enter and exit alone (`container-hover-includes-children`).
   - Write the switch gate from `switch-gate-harness.md` in this skill's folder: flip the switch at the editor's peer, with no hover between, read the regions the toolkit was asked to redraw (never a fresh snapshot: that repaints everything and runs the parent's paint, which hides the fault), see every governed component inside them and showing the new state when the queued paint runs, off then on. Plant the twin (the look applied in the parent's paint) and see it go red.
   - Write the hover gate the same way: the pointer moved through the peer onto each child keeps the hover, out of the container's bounds clears it; its planted twin (hover from the container's own enter and exit) goes red.

Never do:
- Draw a control by hand, or insert or reuse a parameter id.
- Put a state change in a `paint`.
</constraints>

Report: the parameter id, and the evidence from each step as command plus result.
