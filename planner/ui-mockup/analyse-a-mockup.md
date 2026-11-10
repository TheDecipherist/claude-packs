# Analyse a mock-up (for `ui-mockup`, in `workorder-writer`'s Stage 7)

Drawn from the kit's `analyse-reference-look` skill and its `ui-matches-reference-look` and `straight-on-and-aligned` rules, and from a render-and-extract discipline: render, read the render as a specification, never as a mood. The mock-up is the design: the build measures it and is gated against it. So a mock-up approved loosely is built loosely, and a mock-up with no depth is built flat. Two jobs happen here, before the order is handed over: get renders that can be measured, and read them into the order.

## Why depth comes first

The one fault every house build has met: the renders had shadows, bevels and lit edges, the analysis measured positions and colours, and the panel landed flat (matrix12, 2026-11-08: flat cards, knobs and screens beside mock-ups with depth; Stellix B-161: layers without glow). A flat panel beside a raised mock-up can score well on layout and colour and still look nothing like it. So depth is measured as its own rows, in the analysis and in the gate, and a render that does not show depth clearly enough to measure is rendered again until it does.

<constraints>
Always do:

**Getting renders that can be measured (Stage 7)**
1. One render per screen, 16:9, straight on, the screen alone filling the frame: no device, no hands, no perspective, no room. A page, a layer, an open dropdown and a dialog are each their own render.
2. Write the prompt from the order's own words, in bands: the sections in order, every control with its real label and its count, the display and what it shows, the look (colours, light or dark, the type), and the depth in words: where the light comes from, what is raised, what is recessed, how soft the shadows are. Attach the previous render as the reference and say "where the layout below differs from the attached image, the layout below wins".
3. Make a detail render for anything too small to read in the whole: a knob and its label, the display, a button row, a slot. A fresh render of that part in the same design language, never a crop of the whole: a crop distorts spacing, proportions and type, and compression hides the shadow falloff that depth is measured from.
4. Render again, not differently: the next render keeps the palette, the type, the control family, the radius logic and the light. Only what was asked to change changes. Check each new render against the last for drift (a knob style that moved, a colour that shifted, a label that vanished) before showing it.
5. Before approving a render, check it the way the build will measure it, in this order:
   - **Counts:** every section and every control in the order is in the picture, once, with its label as written. A count that differs between the order and the render is a decision, made now and recorded.
   - **Depth:** every raised or recessed element (knob, button, card, screen, field, strip) shows a shadow with a readable falloff, a bevel or a lit edge, under one light. A flat element is flat on purpose and said so.
   - **Alignment:** controls in a row share a centre line, controls in a column share one, grouped things share size and spacing. A render that drifts off its grid is rendered again, not fixed in code later.
   - **Readability:** every label legible at the render's own size; the type consistent across the picture.
   - **Live parts:** a meter, a scope or a screen shows what it will show live, not a decorative stand-in.
   - **Clutter:** no pills, badges, fake status text or decorative markers the order does not name; a control the order does not have is removed from the render, not added to the order.
6. Approve only a render that passes all six. The approved set goes in `design/reference/`, one file per screen, named for it, with the prompt that made it beside it. The concept render from before the interview is replaced, never kept as a second reference.

**Reading the renders into the order (Stage 8)**
7. Read each approved render as a specification, not a vibe. Extract into the order's UI section:
   - **Layout:** every region and every element's place and size as fractions of the picture; the grid they share; the one size of each kind of control.
   - **Depth:** for each kind of element, its shadow (offset x and y, blur width, darkness against the ground), its bevel (light edge width, dark edge width, contrast against the face), its lit edge (brightness, width). Written per kind, so the build's table carries it and a knob's depth is declared once.
   - **Colour:** background, surfaces, borders, the text levels, accents, lit and unlit states, read against the picture's own white and black.
   - **Glow:** colour, radius and strength of every glowing part.
   - **Surfaces:** gradients across a face, textures, how the light falls over the whole.
   - **Type:** the face, sizes, weights and spacing of every text style, and how they relate; the face is a scored choice with a licence, and when the real one cannot be had, the order says so.
   - **Components:** each kind's parts (a dial: track, arc, pointer, ticks, cap; a field: border, label, value, hint), where label and value sit, the real ends of shapes.
   - **Spacing:** gaps between elements and rows, the dividers.
   - **Text:** every label, exactly as rendered, counted.
   - **Unclear:** what the render leaves open, decided here and recorded, never left for the build to fill with a default.
8. Put the counts from the render into the order's repeated-things list, so `design/shape.json` declares each many-concept with the number the picture shows.
9. Tell the build how it will be held to the picture, in the order's UI step: `analyse-reference-look` runs before any page is drawn (`skill-first` refuses the read without it); the panel is drawn in code from one table under `ui-drawn-in-code` and `no-shipped-images`; the look gate measures the render with the same code that measured the target, region by region, geometry on its own, and the depth rows among its measures; a planted fault for each claim, depth off among them, seen red; `look-gate` refuses to land the page without a passing report. A whole-picture score is a likeness, never a pass.
10. For a rebuild of real hardware, the mock-up is the real panel from the correctly lit photo and the drawing, and `straight-on-and-aligned` governs: the object, not the photograph; the camera's angle, the lighting, bends and wear are not design; rectify against a known anchor before measuring.

Never do:
- Approve a render by eye for "looks good". The six checks above are the approval.
- Approve a flat render for a panel that should have depth, or a render whose shadows are too soft or too compressed to measure.
- Crop a detail out of a larger render to stand in for a detail render.
- Keep two references for one screen (the concept and the final, two iterations, a render and a crop). One screen, one picture.
- Let a render add a control, a label, a pill or a marker the order does not name, or drop one it does.
- Prototype the panel or a page in HTML or any second medium: the picture is the design and the build is code; a page in the middle is a copy that drifts.
- Fill a detail the render leaves open with a default at build time: decide it in the order.
- Write the depth as "shadows and bevels like the picture": it is numbers per kind, or the build lands flat.
</constraints>

## The prompt bands, for a render

A render prompt is written in this order, each band a short paragraph, so the model places things in bands too:

1. What the screen is, 16:9, straight on, filling the frame, nothing outside the app.
2. Top band to bottom band: each section with its controls, counts and labels in words.
3. The display or screen and exactly what it shows.
4. The look: palette, light or dark, the type's character, the control family.
5. The depth: the light's direction, what is raised and recessed, shadow softness, bevels, lit edges, glow.
6. What is not in it: no device frame, no hands, no perspective, no pills or badges, no text that is not a label in band 2.
