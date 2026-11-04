---
# concepts: ui, painter
paths:
  - "placeholder"
---

# Every control behaves the house way

Taken from Solera and MegaSynth. Stellix shipped without double-click reset (B-163) because no list said what a control must do, and
later with dropdowns that stepped instead of opening and a page where only one control worked (B-210, B-211), because the gates walked
INIT and never pressed a dropdown.

<constraints>
Always do:
- Give every control (knob, slider, switch, segmented button, drag handle, and any on-screen object that holds a value) all of these, built once in the shared control piece:
  1. Double click returns it to its parameter's default, the value INIT gives it.
  2. Fine drag with a modifier key (Shift on Mac and Windows) for small steps.
  3. The mouse wheel moves it by a fixed step.
  4. Its value is readable while it is moved, in the parameter's own value-to-text.
  5. It never takes keyboard focus, so the computer keyboard keeps playing notes.
  6. One gesture is one undo step.
- Give every choice control (dropdown, select, menu, any control drawn with a chevron or that holds one of a list of values) a real list:
  a press opens the list with every choice and the current one marked; choosing one sets it, and Escape or a press outside closes it.
  It never steps to the next value on a press. The ‹ › arrows beside a list may step, as their own controls.
- Check a new or changed control against this list with the `new-panel-control` skill, and walk one control of each template through the real window in the behaviour gate.
- Walk one control of each template in the real window, on a loaded patch and not only on INIT: it moves its value and the sound or
  the picture, and a choice control opens its list. Prove the rest by a read, not a walk (`test-the-template-once`): a table check that every
  control is built from its template and its binding reaches a live parameter, which is what catches a control wired to nothing. The gate is red on a planted control that does nothing and on a planted dropdown
  that steps instead of opening.
- When a project's reference synth (Solera, MegaSynth) does a behaviour differently, copy it and write down what was copied.

Never do:
- Draw a control by hand on one page instead of using the shared piece.
- Give one page a behaviour the others lack.
