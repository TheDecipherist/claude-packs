---
# concepts: ui, painter, panel-spec
---

# A knob shows its name, its value and its range, and a hub carries its satellites

<constraints>
Always do:
- Draw a knob as a flat matte disc in a dark bezel with a faint inner shadow at the top, and a white needle at 7 : 1 contrast or better, sweeping 270 degrees.
- Mark the ends at 7 and 5 o'clock and the centre at 12, and put the range under the knob (`20` / `18k`, `off` / `full`, `-inf` / `+12`).
- Put the name above the knob and the current value directly under the name, always visible.
- Make the knob a user reaches for first the hub, and the knobs that shape it its satellites: at the diagonals, at 9 and 3, or on its shoulder, each joined to the hub by a straight stem (`tieTo` the hub's id).
- Keep a satellite small: a small name, no scale text, no end ticks, no value (the primary display shows it). Satellites are always cream; only hubs are coloured.
- Put one hub, or two side by side, in a sub-section. A knob between two hubs belongs to the pair and has no stem.

Never do:
- Put a satellite above or below its hub.
- Put three hubs in one sub-section, or squeeze a second hub that does not fit: it becomes a row knob.
</constraints>
