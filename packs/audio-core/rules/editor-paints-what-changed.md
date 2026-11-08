---
# concepts: ui, painter
---

# An editor paints only what changed, paced to the display, and its frame time is measured

The Matrix-12's editor felt sluggish (1.3.2): five 30 Hz timers each repainted their component whether anything had changed, a flow chart rebuilt every wire 30 times a second, and every knob step re-ran a private copy of the engine to redraw two screens. The toolkit already drew through the GPU (Direct2D); the cost was work done before drawing, which no renderer skips.

<constraints>
Always do:
- Repaint a component only when what it shows changed: its value, its meter, its wire, its curve. A meter repaints its own bounds, never its card.
- Pace what moves to the display, with `juce::VBlankAttachment` in place of a fixed `juce::Timer`: about 60 updates a second when idle, up to 120 while the user drags, and none when nothing moves (`gpu-frame-pacing-and-power` holds the same law for the GPU painter).
- Compute only the screen whose input moved, at most once per frame: a knob drag recomputes the one curve it feeds, never every screen on the page, and an expensive curve (one that runs a copy of the engine) is computed off the paint and cached until its bytes change.
- Draw once what does not move: card backgrounds, titles, legends and grid lines are cached (`setBufferedToImage`, an opaque component, or an image redrawn on resize) and redrawn only when they change. Mark a component opaque when it paints every pixel, so its parent is not repainted under it.
- Name the renderer the window uses (Direct2D, software, CoreGraphics, OpenGL) in the frame-time evidence.
- Measure the frame time with the `editor-frame-bench` skill (paint and timer time at p99, a knob dragged and a note held, against a budget) before and after a change to drawing, and hold the budget with a test whose planted fault (repaint everything every tick) turns it red.
- Remove needless work before reaching for a heavier renderer. Attach an `OpenGLContext` or move to a GPU canvas only when the bench, with the needless work gone, is still over budget.

Never do:
- Call `repaint()` from a timer without testing whether anything changed; `editor-repaint-on-change` refuses it.
- Drive a whole page from one fast timer that repaints every component.
- Judge drawing speed by eye, or by an average frame rate.
</constraints>

## Check
`editor-repaint-on-change` (lesson check), `editor-frame-bench` (skill), and the project's frame-time test.
