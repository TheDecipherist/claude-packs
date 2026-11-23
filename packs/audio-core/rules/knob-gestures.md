---
# concepts: ui, painter, panel-spec
paths:
  - "placeholder"
---

# Every knob answers the same gestures

A user learns one set of gestures and uses it on every control of every unit.

<constraints>
Always do:
- Give every knob the same gestures: drag vertically, Shift for fine, double-click to reset, Alt-click to type a value, the wheel to step, right-click for its menu.
- Name the right-click menu's entries: MIDI learn, copy and paste value, reset.
- Let the user set how controls move, in the settings layer, once for every control of the unit: the drag direction (vertical, horizontal, or both), the drag speed as the distance for a full sweep (with a slower and a faster setting either side of the default), the fine factor Shift applies, and the wheel's step. Write the default distance in the project's decisions with why, measure it through the real editor, and keep it the same for every control of one kind.

Never do:
- Give one kind of control a speed of its own that the setting does not move, or make a full sweep need more than one long drag at the default.
- Let a performance control take keyboard focus (`keys-belong-to-the-keyboard`).
</constraints>
