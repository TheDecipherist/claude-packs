---
# concepts: ui, painter, panel-spec
paths:
  - "placeholder"
---

# Every display can expand into a full-window layer for easy editing

A curve drawn in a small card is hard to edit precisely: the points crowd, the scale's labels shrink and a drag of one pixel jumps too far. The same display opened large is easy.

<constraints>
Always do:
- Give every display (a filter curve, an envelope, an LFO, a waveform, an effect's picture, a step grid) a small expand icon in its top right corner, the same icon everywhere, in the display's own corner, never inside the curve.
- Open it as a layer over the whole editor window, the same display at full size: the same model, the same points, the same scale with more ticks, the same morph point (`displays-carry-their-scale`), and the section's own controls beside it so a knob and its curve can be worked together.
- Close it with the same icon (now a collapse icon), with Escape, and with a click outside the display; the panel beneath shows the change at once.
- Stop the covered panel drawing while the layer is open (`hidden-under-a-layer-is-idle`); the sound and the parameters go on.
- Prove it in a gate through the real editor: the icon opens the layer, a drag on the large display moves the same parameter as the small one, every way of closing closes it; planted "an icon that opens nothing" seen red.

Never do:
- Open a second copy of the display with its own model, or a separate window the keyboard and host cannot reach.
- Give one display an expand icon and its siblings none.
</constraints>
