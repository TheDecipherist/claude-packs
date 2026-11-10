---
# concepts: ui, painter, panel-spec
---

# Every control answers the same gestures, and the primary display echoes what was touched

<constraints>
Always do:
- Give every knob the same gestures: drag vertically, Shift for fine, double-click to reset, Alt-click to type a value, the wheel to step, right-click for its menu.
- Name each parameter for the host as `Column . Sub-section . Name`.
- Echo every touched control on the primary display (the preset LCD, top centre): its path on line 1 and its live value on line 2, held 1.5 s, then back to the preset's name. It is the only readout a satellite has.
- Make modulation drag and drop: from an LFO or envelope cell onto a knob, a press that moves is a drag, a ring shows the number of connections, right-click removes one, and the destination shows a halo.

Never do:
- Let a performance control take keyboard focus.
- Add a modulation matrix page: drag and drop is the decision, not a hole.
</constraints>
