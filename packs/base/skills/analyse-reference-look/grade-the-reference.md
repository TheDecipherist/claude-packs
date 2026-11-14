# Grade the reference first

Step 0 of `analyse-reference-look`. Write the grade of each source into the analysis file before any measure.

1. **Grade each source:** front-on (no tilt, no perspective), clean (bytes per pixel is the tell: a heavily compressed file has lost the edges), sample-able (colours can be read by script), and, for a photo of hardware, of the EXACT model asked for (item 2 says what to do when it is not held). Pixel count is not the test: a large, tilted, compressed photo grades below a small clean one.
2. **No source of the exact model:** where the reference is a photo of a unit of hardware and the exact model is not held, with nobody there, record it as a gap (what is missing, what stands in) and go on with the best graded source. Say in the report that the look is of the stand-in.
3. **Close-ups:** take a close-up of each region as well as the full front, so a small legend or a control's marks are read from pixels that hold them.
4. **Which object is the reference:** a remote or a programmer may carry the controls the unit's own front lacks. Name the object each control was read from.
5. **Rack aspect:** a rack unit is 482.6 mm wide and 44.45 mm per U, so 1U is 10.86 to 1 (width to height), 2U 5.43. Check the aspect of a clean crop against it. Reject a camera's uncropped ratio (4:3, 3:2) as the unit's shape.
6. **Printed groupings and formulas:** a bracket, a line or a formula printed on the artwork (a group of switches, "x2", a range) is a number: read it and write it into the analysis.
7. **Clock-face positions:** a pointer read as "7 o'clock" needs the pot's travel and its stop angle first; without them the position is not a value.
8. **Source ranking:** a flat frontal photo of the real unit outranks a drawing for where controls sit; a specification outranks both for proportions.
9. **A vector source** (a front-plate overlay filed as a manual): `pdfimages -list` shows no raster; read the maker's ink from its fill colours. For the colours of the ink and for its legends it outranks any photo; for where controls sit and for proportions the ranking in item 8 stands.
10. **Prototypes:** a press photo may show a pre-production unit, so the manual's numbered front diagram wins on control type and legends.
