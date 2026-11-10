---
name: build-from-reference
description: Use when a screenshot, mockup or design image is the source for a page or component, or when asked to match or copy a look.
---

# Build from a reference image (one job: the code looks like the picture)

The common failure is drift: a strong reference, and a coded result that became generic.

<constraints>
Always do:
1. Read it like a specification before writing code. Extract:
   - **Text:** every readable word: headline, supporting line, button labels, navigation, section headings.
   - **Type:** character, the scale between sizes, line counts, where lines wrap, alignment.
   - **Space:** section gaps, padding, gutters, the grid, card proportions.
   - **Components:** button shapes and hierarchy, border radius, strokes, icons, shadows.
   - **Colour:** the palette, the accent, background and image treatment.
   - **Structure:** section order, density, repeated motifs.
2. Say why it looks strong, in a few lines, and list what is unclear.
3. Build to it section by section, comparing a screenshot with the reference at the same width. A photograph is evidence of the design: draw the object straight on and aligned, never its camera angle or its wear.
4. Resolve what is unclear in this order: the visible design language, the layout and spacing logic, the component family, the polish level, then the most faithful option that can be built.
5. Report every place the code differs from the reference, and why.

Never do:
- Improve it into a default layout, or swap a distinctive section for a generic row.
- Compress generous spacing, or merge sections into a repeated pattern the reference does not have.
- Fill an unclear detail with a default before going through step 4.
</constraints>
