---
# concepts: ui, painter, panel-spec
paths:
  - "placeholder"
---

# A panel is three surface levels, no more

The house look, taken from the house reference plugin. A panel that follows it reads the same in every unit, so the user learns it once. Depth (shadow, bevel, glow) is not set here: `depth-is-designed` governs it, and a glow means lit or active.

<constraints>
Always do:
- Use three surface levels only: the background (darkest, dark slate with a hint of blue and a subtle vertical gradient), the panel (rounded, a hairline top edge) and the header (a recessed bar).
- Set displays in a near-black display surface.

Never do:
- Add a fourth surface level, or tell levels apart by anything but their fill and edge.
</constraints>
