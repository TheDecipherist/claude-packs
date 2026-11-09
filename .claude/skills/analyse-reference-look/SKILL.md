---
name: analyse-reference-look
description: Use before building or rebuilding a page, a screen, an editor or a layer from a reference picture, a mock-up or an existing screenshot. Also /analyse-reference-look.
---

# Analyse a reference picture into numbers

Where the project has the rule `straight-on-and-aligned` (an editor drawn from a photograph of hardware), read it first. Write one analysis file per reference, in the design reference folder, or in `design/analysis/` if that folder is git-ignored. Measure by script, never by eye.

First, separate the object from the photograph. You are learning a design, to draw it straight on. A mock-up is usually drawn that way already; a photograph never is. List what belongs to the picture: the camera's angle, the lens, the lighting, bends, wear, missing parts, compression, and note the source. Start from what is known of the object, its true proportions from a specification if one exists, and rectify before measuring:

- **Rectify against a known anchor:** something placed by a standard, not an edge that may be worn: a device frame's known size, a design system's grid, rack slots where EIA-310 puts them. One such anchor took out a bias of 4 units that the object's own edges left in.
- **When sources disagree:** rank them, and record each one's reading. A flat, frontal picture of the real thing outranks a drawing for places, since a drawing can be wrong about layout while it looks authoritative. A specification outranks both for proportions. A drawing is good for what is even by design: pitch, and the ratio of parts. Where two independent sources agree against a third, the third is the outlier. Two pictures from one shoot are one source.

For each measure, give **a control and a confidence**. The control is the same measurement on something whose answer is known. The confidence says how far to trust the number: a part that fills its search box exactly was not measured at all.

1. **Layout:** every region and every element's centre and size as fractions of the picture. Then find the grid: which elements share a row or a column, which look grouped, and the one size of each kind. Snap to it, and record what the snap moved and why. A measured offset smaller than the design's own spacing is error.
2. **Dark on dark:** a dark part on a dark ground cannot be found by a threshold. Give each one a seed box by hand, from the grid or the neighbouring parts, and measure inside it. Say which parts were seeded.
3. **Colour:** sample the background, surfaces, borders, text levels, accents, lit and unlit states. Read a colour against the picture's own white and black, which takes out exposure and white balance.
4. **Glow:** for every glowing part, the colour, radius and strength, measured from the falloff.
5. **Depth:** for every raised or recessed element (a card, a button, a field, a screen, a control), against the reference's own:
   - **shadow:** its offset (x and y), its blur width (where the falloff goes from 90% to 10% of its darkness) and its darkness against the ground beside it;
   - **bevel:** the width of the light edge and of the dark edge, and each one's contrast against the face;
   - **edge light:** the lit edge's brightness against the face, and its width.
   An element with none of them says so, measured: a flat reference is a result too. A flat render beside a raised reference fails here, whatever its colours and glow score.
6. **Surfaces:** gradients across a face, textures, and how the light falls over the whole.
7. **Type:** font, size, weight and letter spacing of every text style, and how they relate. The typeface is a stated item and a scored choice: render each candidate in the reference's own words, score it against them, and record the scores and the licence. When the real face is not to be had, say so.
8. **Components:** each kind's parts (for a dial: track, value arc, pointer, ticks, cap; for a field: border, label, value, hint), where its label and value sit, and any shape's real ends: a band's end may be slanted or square, and the eye gets it wrong.
9. **Spacing:** the gaps between elements and rows, and the dividers.
10. **Unclear:** what the picture leaves open, or shows damaged: decide from the object, and say so.

Then write the gate:

- List the tolerances for each measure, and mask what is damaged.
- Check geometry exactly, on its own: rows, columns, spacing, sizes and shared centres, read from the drawn page. A whole-picture score passes while every element is wrong, so it is never a pass: it is a likeness, to read beside the rest. One gate passed at 0.868 with its controls on four rows.
- Measure the render with the same code that measured the target, so the gate compares like with like: the depth rows too, the shadow, the bevel and the edge light of each element against the reference's.
- Plant a fault for each thing the gate claims, and diff each planted run against the unplanted result: depth off (no shadow, no bevel) is one of them. An exit code proves nothing: one gate's first run showed three plants "failing", and two had changed nothing, because the gate was already red.
- A measure changed while the gate is red is suspect: say so, and show the thresholds stayed put.
- Declare the look in `.claude/layout.json` `looks` (its name, the reference, and the code globs that draw it), and have the gate write its verdict to `build/evidence/looks/<name>.json`: `{ "reference", "code": <the output of `node .claude/hooks/look-gate.mjs --key <name>`, a hash of the files that draw the look>, "verdict": "pass" | "fail", "measures": {...} }`, the depth rows among the measures. Commit the report on the branch. `look-gate` refuses to land a branch whose look code changed without a passing report for the code as it stands (its `code` key equal to the current one; a report holds no commit, so two branches that left the page alone write the same bytes and never conflict), and names the look after every build that touched it.

Report the analysis file's path and the list of open items.
