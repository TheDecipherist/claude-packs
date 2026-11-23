---
# concepts: ui, painter, panel-spec
paths:
  - "placeholder"
---

# The editor is designed on a 16:9 canvas and resizes at that fixed aspect

A layout made in pixels at one size cannot resize: the window either stays fixed or its parts slide apart. A layout made on a fixed-aspect canvas resizes as one picture, scaled.

<constraints>
Always do:
- Design every page of the editor on one 16:9 canvas, every place and size a fraction of the canvas or a token in canvas units, never a pixel count of one window.
- Make the window resizable with its aspect fixed at 16:9 (a resize corner, and the host's resize where the host allows it), with a minimum size at which every text stays at or above its floor (`panel-sizes-by-kind`).
- Scale every drawing from the canvas: text, strokes, knobs, glows and hit areas grow and shrink together.
- Where the instrument's own face has another shape (a 19-inch rack front is about 3.6 to 1), draw it at its true shape inside the 16:9 canvas, and give the rest of the canvas to what belongs there (a keyboard, a browser), never stretch the face.
- Remember the size the user last chose, per installation, and open at it.
- Prove it in a gate: open the editor at three sizes, the smallest, the default and a large one, and find the same layout scaled (every control's place as a fraction equal within a pixel, nothing clipped, every text at or above its floor); planted "a part laid out in fixed pixels" seen red.

Never do:
- Ship an editor at one fixed size, or one whose aspect drifts when it is resized.
- Stretch the instrument's face to fill the canvas.
</constraints>
