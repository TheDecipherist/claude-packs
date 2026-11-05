---
name: analyse-reference-look
description: Use before building or rebuilding a page, panel or layer from a reference picture or an existing panel image. Also /analyse-reference-look.
---

# Analyse a reference picture into numbers

Write one analysis file per reference, beside it in the design reference folder. Measure by script, never by eye.

First, separate the object from the photograph. You are learning a design, to draw it flat and straight on (`straight-on-and-aligned`). List what belongs to the photograph: the camera's angle, the lens, the lighting, bends, wear and missing parts. A bend moves everything near it. Start from what is known of the object: a panel is a flat rectangle, controls of a kind are one size, what looks like a row is a row, ears mirror each other, text sits level. A measurement that disagrees with those belongs to the photograph.

1. **Layout:** every region and every control's centre and size as fractions of the picture. Then find the grid: which controls share a row or a column, which look grouped, and the one size of each kind. Snap to it, and record what the snap moved and why.
2. **Colour:** sample background, panels, borders, text levels, accents, lit and unlit states.
3. **Glow:** for every glowing part, the colour, radius and strength, measured from the falloff.
4. **Surfaces:** gradients, edge glow, bevels, shadows, textures.
5. **Type:** font, size, weight and letter spacing of every text style, and how they relate.
6. **Controls:** each kind's parts (track ring, value arc, pointer, ticks, cap, skirt, scale numbers) and where its label and value sit.
7. **Spacing:** the gaps between elements and rows, and the dividers.
8. **Unclear:** what the picture leaves open, or shows damaged: decide from the object, and say so.

Then list the tolerances the look gate will use for each measure, and mask what is damaged. The gate checks alignment, sizes and shared centres on their own, because a whole-picture score passes while every knob is wrong. Report the analysis file's path and the list of open items.
