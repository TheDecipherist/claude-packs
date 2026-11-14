---
# concepts: ui, painter
paths:
  - "placeholder"
---

# The editor opens at a size computed from the display, by one function

A fixed opening size is too big for a small display and lost on a large one, and a snapshot taken at another size proves a different window.

<constraints>
Always do:
- Compute the opening size from the display in one function: the scale from the display height, the type bought from the scaled height, then the fit pass in a fixed order.
- Call that same function from the snapshot tool, and judge the render at the opening width.
- Clamp to the declared minimum display.
- Check a plate's design width against the minimum display before shrinking its height: the design width, not the height, decides whether a panel scrolls.
- Declare a layout decision as its test (`if panel + strip > display then fold`), not its outcome, so it expires with the measurement; a saved state always wins.
- List the fit pass in order: compress vertical spacing, then squeeze the gaps, then push legends clear. The pass moves spacing only: sizes (radii, type, controls) stay at their tokens, and a panel that still does not fit scrolls in its container.

Never do:
- Hard-code an opening size in the editor.
- Let the snapshot tool compute its own size.
</constraints>
