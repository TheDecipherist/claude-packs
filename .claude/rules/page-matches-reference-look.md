---
# hook: skill-first.mjs
---

# A page drawn from a reference picture matches its look, measured, not only its layout

A page judged by eye lands flat and plain beside its mock-up: the analysis measured positions, the side by sides compared positions, and no gate measured glow, depth or type. This one rule holds for a page drawn in code as for a page of markup and styles.

<constraints>
Always do:
- Analyse the reference into numbers before drawing anything, with the `analyse-reference-look` skill: layout, colours sampled by script, type, glow and its colour and radius, surfaces and gradients, every control's parts (track, arc, pointer, ticks, value placement), and the gaps between elements. `skill-first` refuses a read of a reference picture or a mock-up until it is loaded.
- Measure every region: its place and size as fractions of the picture, snapped to the grid it implies.
- Sample colours by script, read against the picture's own white and black, never picked by eye.
- Score the typeface against the reference's own words, and record its licence before it ships. Draw every word in the typeface the analysis chose and scored, embedded in the build with its licence row, at the sizes it measured, written as tokens read by name.
- Measure glow (colour, radius, strength) and spacing (every gap, every divider).
- Gate the look: render off-screen at the reference's size and compare region by region (glow, colour, contrast, position, overlap) against the analysis, with a stated tolerance per measure. A knob count differs or a knob moves past tolerance: the gate fails. Plant a fault for each measure (bloom off, a value overlapping a label) and show it fail.
- Measure the render with the same code that measured the target, and diff each planted fault against the unplanted result: an exit code proves nothing when the gate is already red.
- Measure depth, as rows of the same gate: for each raised or recessed part (a knob, a screen, a button, a strip), its shadow's offset, blur width and darkness against the ground; its bevel's light and dark edge widths and contrast; its lit edge's brightness and width; each against the reference's own. A flat render beside a raised reference fails on these rows, whatever its glow and colour score. Decide per side or pooled from the reference's reads and write it down before fitting; hold out by name, in the report's `held_out`, a reading no token can make (`analyse-reference-look`'s `depth-measure.md`). Draw depth by `depth-is-designed`. Plant depth off on every theme and show it fail.
- Measure size by kind and alignment as rows of the same gate where the project follows a house look with sizes by kind: each control's radius against its kind's token, the hub to satellite ratio, the type floors, the gap between texts, the needle's contrast, shared centres and baselines, each with its tolerance. Plant a wrong radius and show it fail.
- Check geometry exactly, on its own, from the drawn page: rows, columns, spacing, sizes and shared centres. A whole-picture score is a likeness, and never a pass.
- Where the reference is a rack unit, gate each front's aspect against the unit's true shape from the 19-inch table in `analyse-reference-look`'s `grade-the-reference.md`; plant a wrong aspect and show it fail.
- Gate that no two control boxes or legends overlap, re-run after every spec edit; plant an overlap and show it fail.
- Gate that every section the reference titles has its title and a ground that draws; plant a missing title and a missing ground and show each fail.
- Treat a render that is offset as a capture bug before a layout bug: check the capture (crop, scale, origin) first.
- Change a replica's paths only when they are remeasured from the reference; taste goes in the project's own paths, never in a replica's.
- Keep repeated components identical: one component, one size (cards, tabs, knobs). A component never shrinks to fit; the container scrolls.
- Keep text readable: at least 4.5 : 1 contrast for small text, measured, on every fill it can sit on.
- Make live what the reference shows live: a meter, a scope or a screen of the engine's state reads it as it moves. A drawn stand-in that never moves is a fault, not a detail.
- Keep one look report per page at `build/evidence/looks/<name>.json`, its look declared in `.claude/layout.json` `looks`. `look-gate` refuses to land a page's code without a passing report for its last change.
- End every drawn page with the user's picture stop on the side by side. A page is not done before that.

Never do:
- Open a reference picture, a mock-up or anything under a `reference/` folder before the `analyse-reference-look` skill is loaded.
- Show the toolkit's default font anywhere a reference names a face, or size a control by eye.
- Land a page drawn from a reference without a passing look report for its code.
- Treat a reference drawing as "layout and control list only". Where a drawing is inconsistent with itself, the written spec picks the right version; it is never a reason to drop the look.
- Pass a page on a whole-picture score, or report a side by side as passing from positions alone: it is a likeness, read beside the measures.
- Call a page done from a side by side seen by eye.
</constraints>

## Check
The `skill-first` hook refuses a read of a reference before the skill is loaded, and `look-gate` refuses a page's code without a passing look report.
