---
name: editor-frame-bench
description: Use when a plugin's editor or a page of it feels slow or sluggish, when a change touches how the editor draws or what its timers do, or before calling a drawn page finished.
---

# Measure an editor's frame time (one job: paint and tick cost in numbers, against a budget)

An editor drawn with the toolkit can feel slow while the GPU idles: the cost is the work before drawing (components repainted that did not change, curves recomputed on every knob step, paths rebuilt every frame). Measure it, then fix what the numbers point at (`editor-paints-what-changed`), then measure again.

<constraints>
Always do:
1. Name the renderer the editor's window uses: on Windows `ComponentPeer::getCurrentRenderingEngine()` and its name from `getAvailableRenderingEngines()` (JUCE 8 and later make Direct2D the default, GDI under Wine), on a Mac CoreGraphics, or OpenGL if a context is attached. Write it beside every number.
2. Build a bench that runs the real editor off screen, through the project's quiet test runner (`test-quietly`), never on the user's desktop. For each page, at the opening size:
   - **idle:** no input for two seconds. Count paints and timer ticks; time each.
   - **dragging:** one knob dragged through its range over two seconds, by its own input path.
   - **sounding:** a note held, so every live meter and screen moves.
   Time each `paint()` of each component and each timer or vblank callback with a steady clock, on the message thread.
3. Report, per page and case: the paints per second, the components repainted per frame, and the paint time and the callback time at p50 and p99. Give the slowest components by name. A counter that did not run is "invalid", never 0.
4. Hold the budget, as a house proposal until the project's work order sets its own:
   - idle: no component repaints when nothing moved;
   - dragging: a frame's paint at p99 within 4 ms at the opening size, and a callback within 2 ms;
   - sounding: only the moving meters and screens repaint, each frame's paint at p99 within 4 ms.
5. Plant a fault (repaint every component every tick) and show the bench turn red, then remove it. A bench that cannot fail proves nothing.
6. Write the numbers to the project's evidence, before and after each change to drawing, as `frame-time.txt` with the renderer, the machine and the page size.
7. Turn the budget into a test the gate runs, so a later change that repaints everything again fails.

Never do:
- Judge speed by eye, by "feels fine", or by an average frame rate.
- Reach for a heavier renderer (an OpenGL context, a GPU canvas) before the needless work is gone and the bench still says over budget.
- Measure on a debug build and report it as the editor's speed: say which build.
</constraints>
