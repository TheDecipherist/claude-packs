---
name: app-screen
description: Use when building or changing an application screen, a dashboard, an admin or analytics view, settings, an inbox or a list screen.
---

# Build an app screen from its data (one job: a screen that answers its question)

A page is read once; a screen is read every day. `apps-are-not-pages` says what changes.

<constraints>
Always do:
1. Inventory, in 8 to 12 lines: the objects and fields with units; real magnitudes, including how small they are for a new account; who opens this, how often, on what device; what they do next, and which job comes up most; the product's own things (its name, the people, what people recognise by sight).
2. Write the data first: a small dataset the screen renders from, with believable names, amounts that add up and a unit on every figure. Totals are computed from the rows. Assert in the data file what must agree, and read the console.
3. Write the screen's one question and one finding (`screen-answers-one-question`), then list the blocks as answers to the next questions.
4. Pick the shell: a sidebar on the page's own ground, or a top bar only if it carries something. One left edge and one right edge for every block.
5. Set the KPIs: default to one container split by 1px dividers; values 16-40px, about 1.7 times the label; label above the value, grey, sentence case. Nothing else in the tile. The answer figure is 30-36px and at least 1.3 times its siblings. A figure appears in one place only.
6. Set tables: rows 36-53px, 56-92px with media; 12px grey sentence-case headers, no band; numbers right-aligned with their header; one status mark; a sort glyph on the active column only. Overview lists show 2-5 rows.
7. Forms: label above the field, 14px; no floating labels; one control height per context. Disabled controls stay legible and say why. Beside a setting, show what it produces.
8. Build every block's empty, zero, loading and error state, and every row's hover, selected, focus and disabled state. A screen that works only with full data is half built.
9. Check the rendered screen at 1440, 768 and 390 (`prove-page`), and answer in writing:
   - Is the question answered by the biggest thing, and read first?
   - Do all blocks share the screen's edges, with no dead strip or stretched card?
   - Is colour only on data, status and the one action?
   - Do the numbers add up and line up, and does every fact shown twice agree?
   - Does every zero look like a zero, and every missing value like a dash?
   - Does each legend match its mark, with no label colliding?
   - On the phone, is the navigation folded, and does each block still answer?
10. Fix the worst three, look again, three rounds at most. If a problem shows in a screenshot it is real, whatever the code says.

Never do:
- Shrink the type and keep the padding: density is row pitch, padding and type moved together.
- Mix save models on one view.
</constraints>
