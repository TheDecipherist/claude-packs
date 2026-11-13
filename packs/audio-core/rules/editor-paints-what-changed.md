---
# concepts: ui, painter
paths:
  - "placeholder"
---

# An editor paints only what changed, paced to the display, and its frame time is measured

The Matrix-12's editor felt sluggish (1.3.2): five 30 Hz timers each repainted their component whether anything had changed, a flow chart rebuilt every wire 30 times a second, and every knob step re-ran a private copy of the engine to redraw two screens. The toolkit already drew through the GPU (Direct2D); the cost was work done before drawing, which no renderer skips.

<constraints>
Always do:
- Repaint a component only when what it shows changed: its value, its meter, its wire, its curve. A meter repaints its own bounds, never its card.
- Pace what moves to the display, with `juce::VBlankAttachment` in place of a fixed `juce::Timer`: about 60 updates a second when idle, up to 120 while the user drags, and none when nothing moves (`gpu-frame-pacing-and-power` holds the same law for the GPU painter).
- Compute only the screen whose input moved, at most once per frame: a knob drag recomputes the one curve it feeds, never every screen on the page, and an expensive curve (one that runs a copy of the engine) is computed off the paint and cached until its bytes change.
- Draw once what does not move: card backgrounds, titles, legends and grid lines are cached (`setBufferedToImage`, an opaque component, or an image redrawn on resize) and redrawn only when they change. Mark a component opaque when it paints every pixel, so its parent is not repainted under it.
- Make a dirty rectangle hold the drawn footprint, glow included: a repaint that clips a knob's glow leaves a ghost.
- Name the renderer the window uses (Direct2D, software, CoreGraphics, OpenGL) in the frame-time evidence.
- Measure the frame time with the `editor-frame-bench` skill (paint and timer time at p99, a knob dragged and a note held, against a budget) before and after a change to drawing, and hold the budget with a test whose planted fault (repaint everything every tick) turns it red.
- Remove needless work before reaching for a heavier renderer. Attach an `OpenGLContext` or move to a GPU canvas only when the bench, with the needless work gone, is still over budget.
- Let a paint draw and nothing else. A change of state (a switch, a mode, a bypass, a power, a mute, a selection, a hover) is applied where it happens, in one function that names every component whose look it governs (their alpha, enabled state, visibility, colour, text) and repaints exactly those. A switch changes everything it governs at once, with no hover, resize or other repaint needed to finish the job.
- Decide hover on a container as "the pointer is over the container or any of its children": `isMouseOver (true)`, or the container listening to its children with `addMouseListener (this, true)`. Decide it in one place, and repaint what the hover governs when it changes. The container's own `mouseEnter` and `mouseExit` are not enough: JUCE sends the container a `mouseExit` when the pointer moves onto one of its children.
- For every on/off control (a switch, a bypass, a power, a mute), test the look it governs through the redrawn region, not a fresh snapshot (`new-panel-control`, step 7, `switch-gate-harness.md`). Flip it through its real input at the editor's peer, with no hover in between, and read the regions the toolkit was asked to redraw: every component the switch governs lies inside their union, and when the queued paint is run each draws its new state. Do it both ways, off then on. Its planted twin (the look applied in the parent's paint) must go red.
- For every container with a hover, test it the same way: move the pointer through the peer onto each child and see the hover kept, move it out of the container's bounds and see the hover cleared. Its planted twin (hover from the container's own enter and exit alone) must go red.
- Read what was redrawn for any look a state change should move. A test that reads a look from a fresh snapshot (`createComponentSnapshot`, a new paint of the whole editor) repaints everything and runs the parent's paint, so it passes the fault it was written to find.

Never do:
- Call `repaint()` from a timer without testing whether anything changed; `editor-repaint-on-change` refuses it.
- Call `setAlpha`, `setVisible`, `setEnabled`, `setBounds`, `setColour` on a component, `addAndMakeVisible`, `removeChildComponent` or `resized` inside a `paint` or `paintOverChildren`; `no-state-change-in-paint` refuses it.
- Drive a container's hover flag from its own `mouseEnter` and `mouseExit` alone when it has child components; `container-hover-includes-children` refuses it.
- Judge a state change's look from a fresh snapshot of the editor.
- Drive a whole page from one fast timer that repaints every component.
- Judge drawing speed by eye, or by an average frame rate.
</constraints>

## Check
`editor-repaint-on-change`, `no-state-change-in-paint` and `container-hover-includes-children` (lesson checks), `editor-frame-bench` (skill), and the project's frame-time test.
