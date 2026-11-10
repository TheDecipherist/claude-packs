---
# concepts: ui
paths:
  - "placeholder"
---

# A control is proved through its own input path

A gate that writes the parameter proves the parameter, never the control. On the MPX 500 every control passed such a gate, while a knob's mouse handling could be compiled out with its table row, class and binding all intact. Driving the real editor found five real bugs: the host's first sync written over the loaded program, a double click that did not go back, small wheel movements lost on every knob, an LED that never lit, and a drag thrown backwards by a modifier.

<constraints>
Always do:
- Drive a control through its own input path: the real component in the real editor, at its peer, so the toolkit's own hit test, click counting and drag tracking decide what receives each gesture.
- Read what the gesture moved at each end of the chain: the parameter or the machine's state, the pixels, and the audio.
- Work every gesture the control has: press, release, drag, fine drag, wheel, a small wheel movement, double click.
- Prove a press on its own: a recipe that also turns a knob moves the audio whatever the press did.
- Prove the gate can fail: with one control's input handling taken out, the gate goes red while a gate that writes the parameter stays green. Keep both results.
- Run a planted fault in each control in turn: one unhooked control leaves its row, class and binding intact, so nothing else sees it.
- Run anything that opens a window on a virtual display (`xvfb-run -a <gate>`), by hand as well as in the suite, so it never takes focus from the user's desktop.

Never do:
- Call a control proved because its parameter moved when written, or because its row reads right.
- Call a method on the component in place of a gesture: that goes round the hit test.
</constraints>

## Check
Test: for each control kind, a gesture sent at the real editor's peer moves its parameter, its pixels and the audio, and the same test goes red with that control's input handling compiled out.
