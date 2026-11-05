---
name: analyse-reference-look
description: Use before building or rebuilding a page, panel or layer from a reference picture or an existing panel image. Also /analyse-reference-look.
---

# Analyse a reference picture into numbers

Read `straight-on-and-aligned` first: it governs every decision below. Write one analysis file per reference, in the design reference folder, or in `design/analysis/` if that folder is git-ignored. Measure by script, never by eye.

First, separate the object from the photograph. You are learning a design, to draw it flat and straight on. List what belongs to the photograph: the camera's angle, the lens, the lighting, bends, wear and missing parts, and note the camera. A bend moves everything near it. Start from what is known of the object, its true proportions from a specification if one exists, and rectify before measuring:

- **Rectify against a known anchor:** something placed by a standard, not an edge that may be worn. Rack slots sit where EIA-310 puts them, and they took out a bias of 4 units that the panel's own edges left in.
- **When sources disagree:** rank them, and record each one's reading. A flat, frontal photograph of the real unit outranks a drawing for places, since a guide's drawing can be wrong about layout while it looks authoritative. A specification outranks both for proportions. A drawing is good for what is even by design: pitch, and the ratio of parts. Where two independent sources agree against a third, the third is the outlier. Two pictures from one shoot are one source.

For each measure, give **a control and a confidence**. The control is the same measurement on something whose answer is known. The confidence says how far to trust the number: a part that fills its search box exactly was not measured at all.

1. **Layout:** every region and every control's centre and size as fractions of the picture. Then find the grid: which controls share a row or a column, which look grouped, and the one size of each kind. Snap to it, and record what the snap moved and why. A measured offset smaller than the design's own spacing is error.
2. **Dark on dark:** a dark part on a dark panel cannot be found by a threshold. Give each one a seed box by hand, from the grid or the neighbouring parts, and measure inside it. Say which parts were seeded.
3. **Colour:** sample background, panels, borders, text levels, accents, lit and unlit states. Read a colour against the photograph's own white and black, which takes out exposure and white balance.
4. **Glow:** for every glowing part, the colour, radius and strength, measured from the falloff.
5. **Surfaces:** gradients, edge glow, bevels, shadows, textures.
6. **Type:** font, size, weight and letter spacing of every text style, and how they relate. The typeface is a stated item and a scored choice: render each candidate in the target's legends, score it against them, and record the scores and the licence. When the real face is not to be had, say so.
7. **Controls:** each kind's parts (track ring, value arc, pointer, ticks, cap, skirt, scale numbers), where its label and value sit, and any shape's real ends: a band's end may be slanted or square, and the eye gets it wrong.
8. **Spacing:** the gaps between elements and rows, and the dividers.
9. **Unclear:** what the picture leaves open, or shows damaged: decide from the object, and say so.

Then write the gate:

- List the tolerances for each measure, and mask what is damaged.
- Check geometry exactly, on its own: rows, columns, spacing, sizes and shared centres, read from the drawn panel. A whole-picture score passes while every knob is wrong, so it is never a pass: it is a likeness, to read beside the rest.
- Measure the render with the same code that measured the target, so the gate compares like with like.
- Plant a fault for each thing the gate claims, and diff each planted run against the unplanted result. An exit code proves nothing: the first run of the MPX 500's gate showed three plants "failing", and two had changed nothing, because the gate was already red.
- A meter changed while the gate is red is suspect: say so, and show the thresholds stayed put.

Report the analysis file's path and the list of open items.
