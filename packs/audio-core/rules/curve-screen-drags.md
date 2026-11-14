---
# concepts: ui, painter, panel-spec
paths:
  - "placeholder"
---

# A drag on a drawn curve uses one model and one time axis

A curve whose display and drag keep separate models puts the point away from the pointer, and a window that rescales slides under the drag.

<constraints>
Always do:
- Share one model and one absolute time axis between the display and the drag, so the point lands under the pointer and the window never slides mid-drag.
- Leave a margin after the last point.
- Clamp at the parameter's limit, and say so on the screen.
- Let points never cross.
- Gate it with routed moves in small and large steps and past the edges, sent through the editor's real input path.

Never do:
- Rescale the time axis while a point is held, or give the drag its own copy of the curve.
</constraints>
