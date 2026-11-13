# Measuring depth, and deciding the measure before the fit

Read at step 5 (Depth) and again when the depth rows are written into the gate. A depth gate fails for its measure as often as for its drawing: in bandwarp two runs from the same brief drew the dark themes as well as the first run did, kept a per-side measure the first run had decided against, and ended with three red gates the first run passed (KWB-217, d-112 to d-114). The choices below are made from the reference's own reads, written into the analysis, and only then is anything fitted.

## Per side or pooled: decided from the reference, before fitting

Measure each element's shadow, bevel and lit edge on each of its four sides first, in the reference. Then, per kind of element (cards, buttons, knobs, screens):

- **Directional light:** the sides differ in one direction (the shadow falls down and right; the lit edge is the top one), and the same direction on every element of the kind. Keep per-side rows: the direction is part of the look.
- **No direction:** the sides of one element spread wider than the tolerance, but the high side is not the same on the elements of the kind (textured metal, brushed or noisy grounds). The theme holds one amount for the kind, so compare the mean of the four sides, one row per element; a knob's ring reads as one. Write the spread you measured beside the pooled row.

Write which one, per kind and per theme, into the analysis with its reads, before the first fit. A switch from per side to pooled after seeing the gate red is moving a threshold: say so, and show the reference's reads that justify it.

## A reading no token can make: hold it out by name

A shadow only darkens, a lit edge only lightens. When a reference reading is outside what any amount of the theme's tokens can draw (a ground lighter beyond a dark moat, so the shadow row reads negative), do one of:

- add the token the reference shows (a moat, a second shadow) and fit it; or
- hold the row out by name in the report's `held_out` as `{ "reference", "limit", "reason" }`: the reference's reading, the render's reading with the token at the end of its range (0 or its maximum, whichever way the reference lies), and why no token reaches it.

A row the fit did not close is not out of reach: a fitter's best is no limit. Show the limit, or keep fitting. More than two rows held out on one look (the look's `heldOutMax` in layout.json) is a token the theme lacks, not readings no token can make: add the token (a moat, a lit rim), fit it, gate again. `look-gate` refuses to land a report with a held-out row missing its limit, or with more rows than the look allows. One run held out 14 rows on one theme on a fit's best, where the original held out one (KWB-217).

Never widen the tolerance for it, and never drop the row without naming it. A held-out row is an open point for the user, not a pass.

## Surfaces on a dark theme: sample at named spots

Do not find "the surface" as whatever is lighter than the ground: on a dark theme the cards may be darker than the ground, and the render and the reference then each return a different thing. Sample each surface at a named spot of a named element (a card's lower-left corner area, a screen's centre), the same spot in the reference and in the render, by the same code.

## Every theme

Each theme is its own reference: measure, decide per side or pooled, fit and gate each one, and plant depth off on each. A theme with no reference is gated on its height order alone (raised above flat above recessed, by the same token levels), and says so.
