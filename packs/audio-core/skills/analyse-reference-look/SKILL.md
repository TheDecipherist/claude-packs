---
name: analyse-reference-look
description: Use before building or rebuilding a page, panel or layer from a reference picture or an existing panel image. Also /analyse-reference-look.
---

# Analyse a reference picture into numbers

Write one analysis file per reference, beside it in the design reference folder. Measure by script, never by eye.

1. **Layout:** every region and every control's centre and size as fractions of the picture.
2. **Colour:** sample background, panels, borders, text levels, accents, lit and unlit states.
3. **Glow:** for every glowing part, the colour, radius and strength, measured from the falloff.
4. **Surfaces:** gradients, edge glow, bevels, shadows, textures.
5. **Type:** font, size, weight and letter spacing of every text style, and how they relate.
6. **Controls:** each kind's parts (track ring, value arc, pointer, ticks, cap, skirt, scale numbers) and where its label and value sit.
7. **Spacing:** the gaps between elements and rows, and the dividers.
8. **Unclear:** what the picture leaves open, for the user.

Then list the tolerances the look gate will use for each measure. Report the analysis file's path and the list of open items.
