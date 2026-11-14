---
# concepts: ui, painter, panel-spec
paths:
  - "placeholder"
---

# The primary display echoes every touched control

A satellite has no readout of its own, so the primary display is the only place its value shows.

<constraints>
Always do:
- Echo every touched control on the primary display (the preset LCD, top centre): its path on line 1 and its live value on line 2, held 1.5 s, then back to the preset's name.
- Echo an automated control dim, so it reads as the host's move and not the user's.
- Take the echo from touch, drag, click, scroll, MIDI and host automation, never from hover (a tooltip is no substitute); a plugin with no preset bar keeps the display in the same top-centre place.

Never do:
- Give a satellite its own value readout in place of the echo.
</constraints>
