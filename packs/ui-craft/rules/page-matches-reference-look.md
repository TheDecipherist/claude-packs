---
# concepts: ui-markup, ui-styles
paths:
  - "placeholder"
---

# A page drawn from a reference picture matches its look, measured, not only its layout

Pages built from mock-ups land flat and plain beside them when the look is judged by eye: matrix12's pages (2026-11-08) had flat cards and screens beside mock-ups with shadows and bevels, and passed on colour and glow.

<constraints>
Always do:
- Analyse the reference into numbers before drawing, with the `analyse-reference-look` skill. `skill-first` refuses a read of a reference picture or a mock-up until it is loaded.
- Measure every region: its place and size as fractions of the picture, snapped to the grid it implies.
- Sample colours by script, read against the picture's own white and black, never picked by eye.
- Score the typeface against the reference's own words, and record its licence before it ships.
- Measure glow (colour, radius, strength) and spacing (every gap, every divider).
- Measure depth for each raised or recessed element: the shadow's offset, blur width and darkness against the ground; the bevel's light and dark edge widths and contrast; the lit edge's brightness and width. A flat render beside a raised reference fails these rows.
- Gate the render with the same code that measured the reference, each measure with its tolerance, and plant a fault for each (depth off is one) to see it fail.
- Keep one look report per page at `build/evidence/looks/<name>.json`, its look declared in `.claude/layout.json` `looks`. `look-gate` refuses to land a page's code without a passing report for its last change.

Never do:
- Pass a page on a whole-picture score: it is a likeness, read beside the measures.
- Call a page done from a side by side seen by eye.
</constraints>
