---
# concepts: ui, painter
paths:
  - "placeholder"
---

# Every control behaves the house way

Taken from Solera and MegaSynth. Stellix shipped without double-click reset (B-163) because no list said what a control must do.

<constraints>
Always do:
- Give every control (knob, slider, switch, segmented button, drag handle, and any on-screen object that holds a value) all of these, built once in the shared control piece:
  1. Double click returns it to its parameter's default, the value INIT gives it.
  2. Fine drag with a modifier key (Shift on Mac and Windows) for small steps.
  3. The mouse wheel moves it by a fixed step.
  4. Its value is readable while it is moved, in the parameter's own value-to-text.
  5. It never takes keyboard focus, so the computer keyboard keeps playing notes.
  6. One gesture is one undo step.
- Check a new or changed control against this list with the `new-panel-control` skill, and walk every control through the real window in the behaviour gate.
- When a project's reference synth (Solera, MegaSynth) does a behaviour differently, copy it and write down what was copied.

Never do:
- Draw a control by hand on one page instead of using the shared piece.
- Give one page a behaviour the others lack.
