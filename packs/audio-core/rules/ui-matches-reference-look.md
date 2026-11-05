---
# concepts: ui, painter
paths:
  - "placeholder"
---

# A UI built from a reference matches its look, not only its layout

Stellix's layers landed flat and without glow (B-161): the analysis measured positions, the side-by-sides compared positions, no gate measured the look, and the brief said "not widget details".

<constraints>
Always do:
- Analyse the reference into numbers before drawing anything, with the `analyse-reference-look` skill: layout, colours sampled by script, type, glow and its colour and radius, surfaces and gradients, every control's parts (track, arc, pointer, ticks, value placement), and the gaps between elements.
- Gate the look: render off-screen at the reference's size and compare region by region (glow, colour, contrast, position, overlap) against the analysis, with a stated tolerance per measure. A knob count differs or a knob moves past tolerance: the gate fails. Plant a fault (bloom off, a value overlapping a label) and show it fail.
- Check geometry exactly, on its own, from the drawn panel: rows, columns, spacing, sizes and shared centres. A whole-picture score is a likeness, and never a pass: the MPX 500 passed at 0.868 with its knobs on four rows.
- Measure the render with the code that measured the target, and diff each planted fault against the unplanted result: an exit code proves nothing when the gate is already red.
- Keep repeated components identical: one component, one size (cards, tabs, knobs). A component never shrinks to fit; the container scrolls.
- Keep text readable: at least 4.5 : 1 contrast for small text, measured, on every fill it can sit on.
- End every drawn page with the user's picture stop on the side by side. A page is not done before that.

Never do:
- Treat a reference drawing as "layout and control list only". Where a drawing is inconsistent with itself, the written spec picks the right version; it is never a reason to drop the look.
- Report a side by side as passing from positions alone.
