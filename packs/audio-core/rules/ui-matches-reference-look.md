---
# concepts: ui, painter
paths:
  - "placeholder"
---

# A UI built from a reference matches its look, not only its layout

Stellix's layers landed flat and without glow (B-161): the analysis measured positions, the side-by-sides compared positions, no gate measured the look, and the brief said "not widget details". The Matrix-12's editor pages landed far plainer than their mock-ups (1.3.1): this rule was installed, the skill was never run, and the renders were judged by eye. Now `skill-first` refuses a read of a reference picture until the skill is loaded.

<constraints>
Always do:
- Analyse the reference into numbers before drawing anything, with the `analyse-reference-look` skill: layout, colours sampled by script, type, glow and its colour and radius, surfaces and gradients, every control's parts (track, arc, pointer, ticks, value placement), and the gaps between elements.
- Gate the look: render off-screen at the reference's size and compare region by region (glow, colour, contrast, position, overlap) against the analysis, with a stated tolerance per measure. A knob count differs or a knob moves past tolerance: the gate fails. Plant a fault (bloom off, a value overlapping a label) and show it fail.
- Measure depth, as rows of the same gate: for each raised or recessed part (a knob, a screen, a button, a strip), its shadow's offset, blur width and darkness against the ground; its bevel's light and dark edge widths and contrast; its lit edge's brightness and width; each against the reference's own. A flat render beside a raised reference fails on these rows, whatever its glow and colour score (matrix12, 2026-11-08: flat cards, knobs and screens beside mock-ups with shadows and bevels). Plant depth off and show it fail.
- Measure size by kind and alignment as rows of the same gate where the project follows the house look (`panel-sizes-by-kind`): each control's radius against its kind's token, the hub to satellite ratio, the type floors, the gap between texts, the needle's contrast, shared centres and baselines, each with its tolerance. Plant a wrong radius and show it fail.
- Check geometry exactly, on its own, from the drawn panel: rows, columns, spacing, sizes and shared centres. A whole-picture score is a likeness, and never a pass: the MPX 500 passed at 0.868 with its knobs on four rows.
- Measure the render with the code that measured the target, and diff each planted fault against the unplanted result: an exit code proves nothing when the gate is already red.
- Keep repeated components identical: one component, one size (cards, tabs, knobs). A component never shrinks to fit; the container scrolls.
- Keep text readable: at least 4.5 : 1 contrast for small text, measured, on every fill it can sit on.
- Draw every word in the typeface the analysis chose and scored, embedded in the build with its licence row, at the sizes it measured, written as tokens read by name.
- Make live what the reference shows live: a meter, a scope or a screen of the engine's state reads it as it moves. A drawn stand-in that never moves is a fault, not a detail.
- End every drawn page with the user's picture stop on the side by side. A page is not done before that.

Never do:
- Open a reference picture, a mock-up or anything under a `reference/` folder before the `analyse-reference-look` skill is loaded; `skill-first` refuses it.
- Show the toolkit's default font anywhere a reference names a face, or size a control by eye.
- Land a page drawn from a reference without a passing look report for its code; `look-gate` refuses it.
- Treat a reference drawing as "layout and control list only". Where a drawing is inconsistent with itself, the written spec picks the right version; it is never a reason to drop the look.
- Report a side by side as passing from positions alone.
