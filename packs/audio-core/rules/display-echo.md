---
# concepts: ui, painter, panel-spec
paths:
  - "placeholder"
---

# The primary display echoes every touched control

A satellite has no readout of its own, so the primary display is the only place its value shows.

<constraints>
Always do:
- Echo every touched control on a display: its path on line 1 and its live value on line 2, updating while the control moves, held for the hold time after the last movement, then back to what that display showed before.
- Let the user choose where the echo shows, in the settings layer: on the primary display (the preset LCD, top centre), or on the display of the section the control belongs to when that section has one (a filter knob echoes on the filter's curve display, its curve still drawn beneath), falling back to the primary display for a section without one. The default is the primary display.
- Let the user set the hold time in the same place. Its default is the machine's own temporary-display time on a reproduction, read from its firmware or manual, and 1.5 s on an original.
- Echo an automated control dim, so it reads as the host's move and not the user's.
- Take the echo from touch, drag, click, scroll, MIDI and host automation, never from hover (a tooltip is no substitute); a plugin with no preset bar keeps the display in the same top-centre place.

Never do:
- Give a satellite its own value readout in place of the echo.
</constraints>
