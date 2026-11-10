---
name: read-a-screen-image
description: Use when a manual, a service manual or a photo shows the machine's own screen (a play or edit page, a menu, a test-mode page, an LCD), or before building a screen, a page or a menu of the rebuild from one.
---

# Read a screen image into a report (one job: everything one screen shows, written down, so the rebuild shows it exactly)

The machine's own screen pictures are the most exact source a rebuilt screen has: the real text, fonts, colours, layout, and the gesture that reaches each page. An owner's manual shows the screens in operation and explains them in its callouts. A service manual shows test-mode screens no owner's manual prints, and the hidden gestures that open them. A screen read loosely is rebuilt loosely.

<constraints>
Always do:
1. One screen, one report: `<out>/screens/<NN>-<screen name>.md`, numbered in the manual's order. Read the PDF by `pdf-to-md` first, with the image switch on and the page rendered at 300 dpi or more. Crop the screen from the page render, and keep both outside the repo; name both in the report.
2. Read at full resolution, as `read-a-circuit-diagram` reads a sheet. Cut a crop larger than about 1,100 px into overlapping tiles and read every tile; zoom twice into small text. Never read a screen from OCR text alone: OCR drops symbols, spacing and case.
3. Write the report with these sections, in order:
   - **Source:** the file, the page, the figure, the machine, the kind (`[MAN]` operation, `[SVC]` test mode, `[PHOTO]`), and any version the screen itself shows.
   - **How it is reached:** every step from power-on, with buttons named as printed, held keys and sequences (SHIFT held with 7, 8, 7, 8), touch targets, and how to leave. Mark a hidden gesture, and a gesture that holds two buttons at once: it needs its mouse path.
   - **Grid:** the screen's native size in pixels or characters, from the service notes, the LCD's data sheet or the firmware. Then each region (title bar, tabs, lists, knob row, function-key row) with its position and size, measured on the crop and scaled to that size.
   - **Text:** a table of every string exactly as shown, its case, spacing, punctuation, abbreviation and truncation kept, with its position, font (size, weight, fixed or proportional, which of the machine's fonts), colour and state (selected, greyed, inverse, blinking, lit). Give the count.
   - **Colours:** each colour sampled from the crop as hex, with its element. Say when the print or the lighting may have shifted it, and prefer a colour the firmware's palette or a correctly lit photo gives.
   - **Graphics:** each icon, bitmap, background, meter and cursor: what it is, its size, and where its bitmap likely lives in the firmware.
   - **Behaviour:** what each control does on this screen (encoder, numbered knobs, function keys, touch areas, cursor), which fields are live values and which are fixed, list lengths and paging (16/33), and every callout the manual prints beside the picture, quoted.
   - **The firmware's copy:** for each string, where the firmware holds it (its display pools, from `names-first`), tagged `[FW]`; for each bitmap, its image bank. A string not found is a `[gap]`.
   - **Not read:** what could not be read, the tile, and why.
   - **For the build:** the facts the rebuilt screen must hold, each with its reference.
4. Check the work: every string on the crop is in the Text table (count them), and every gesture step is a control on the panel drawing.
5. Join the screens into `menu-map`: each screen is a node and each gesture an edge, so the map shows how every page is reached.
6. Last, set the report against the rebuilt screen: a side-by-side at the same scale, element by element, and a table of each string, position, font and colour: match, differs, missing. That table is the point of the report.

Never do:
- Retype a string from memory, or correct its spelling, case or abbreviation: the screen's own text is the spec, its mistakes included.
- Take a colour from a lit photo or a printed page without saying it may be shifted.
- Copy a manual's picture, a crop or a page render into the repo. Link the source and keep the file outside.
- Call a rebuilt screen matched without the side-by-side.
</constraints>
