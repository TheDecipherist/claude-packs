---
paths:
  - "**/*.cpp"
  - "**/*.cc"
  - "**/*.h"
  - "**/*.hpp"
  - "**/*.mm"
  - "**/*.py"
  - "**/*.ts"
  - "**/*.js"
  - "**/*.mjs"
---

# What a layer hides does no work: covered parts are not drawn, moved or animated

A settings layer, a pop-up or a full-panel page opened over a panel hides what is under it. A meter, a scope, a moving curve or a timer under it keeps spending the CPU on pictures nobody sees. Only what the user can see is drawn.

<constraints>
Always do:
- When a layer opens, stop every paint, timer, animation and live display of what it covers completely: the covered views stop repainting, their timers stop, their animations pause. In JUCE, a covered component is hidden or its timer stopped (`isShowing()` false is not enough while it still repaints); in a browser, a covered subtree is `inert`, its `requestAnimationFrame` loops cancelled and its CSS animations paused.
- Keep drawing what shows through a translucent layer, and only that: a dimmed page beneath still shows, so it still draws, but its parts the layer hides fully do not. A partly covered view draws only its visible part.
- Keep the model running: the sound, the parameters, the automation and the meters' values go on under the layer; only their pictures stop.
- When the layer closes, draw what was under it once, at its current values, then resume its motion from now. Never replay what was missed.
- Treat a layer that covers everything as the editor's own hidden state: the editor's rule (0 frames for a hidden or covered editor) holds for it too.
- Prove it with the `prove-hidden-is-idle` skill: what each opaque layer covers paints and ticks 0 times in a second, with a planted fault seen red.

Never do:
- Hide a view behind a layer and leave its timer, animation or repaint running.
- Stop the audio, a parameter or a modulation because its picture is covered.
- Pause what shows through a translucent layer, or let a closed layer leave the page beneath stale.
</constraints>
