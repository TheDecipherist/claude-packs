---
# concepts: ui, painter, panel-spec
paths:
  - "placeholder"
---

# Colour says what a control does, dusty and never neon, and red is never a knob

<constraints>
Always do:
- Colour a hub by its role: pink for frequency, orange for amount (drive, send, mix, output), steel blue for detection (threshold, speed, input), violet for space (size, damp), teal for shape, white for neutral (resonance, the LFO row). Satellites are cream.
- Hold a hub's colour to a lightness band and a saturation band, and draw a section's bars at one constant lightness and saturation, so sections read as a set.
- Keep at most one coloured knob for every three neutral ones. Orange is for amount knobs, accent text, the active tab or cell and a display's curve, and nothing else.
- Draw a selector as a dark box with blue text and a 6-unit chevron centred below it, as wide as its widest value plus 12; a value box the same, with orange text and no chevron; an LCD as orange seven segments with the unlit segments showing.
- Light an LED red for engaged-and-you-should-know (bypass, ducker, clip), green for a detector open or a lock, white for a header's ON. A toggle brightens its cap and has no LED.
- Draw a slider as a dark groove with a silver capsule cap, a meter as a green, yellow and red ladder, and a display as a dark grid with a 2-unit orange curve and hollow orange nodes, no fill.
- Draw a caption that is state from the state, live (`MANUAL TEMPO` / `HOST TEMPO`).

Never do:
- Colour a knob red, or make a dangerous action (panic) a red button: it is dark red text on a dark box.
- Keep a colour in a unit's code: colours live in the theme, read by name.
</constraints>
