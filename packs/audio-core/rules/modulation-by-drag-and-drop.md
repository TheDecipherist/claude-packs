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
- Read an empty second source as unity, not zero (a route is `dest += src x depth`, scaled by the second source when there is one), and let patching the same source and destination pair edit the existing route instead of stacking a second.

Never do:
- Make a route by a menu alone on our own design; a rebuild keeps the machine's own edit-page matrix as well.
</constraints>
