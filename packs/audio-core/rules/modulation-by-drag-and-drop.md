---
# concepts: ui, painter, panel-spec
paths:
  - "placeholder"
---

# Modulation is made by dragging a source onto a knob

Drag and drop is the best way to make a route: the user sees the source and the target in one move.

<constraints>
Always do:
- Make modulation drag and drop: from an LFO or envelope cell onto a knob, a press that moves is a drag.
- Show on the knob a ring with the number of connections, and a halo on the destination while dragging.
- Remove a route with right-click.
- Pair it with the overview page of `modulation-overview-page`.

Never do:
- Make a route by a menu alone.
</constraints>
