---
# concepts: ui, painter, panel-spec
paths:
  - "placeholder"
---

# On an original, no state shows by colour alone

A reproduction keeps the machine's colour-only LEDs (`reproduction-or-original`); our own designs survive colour blindness.

<constraints>
Always do:
- Show a lit state as shape plus colour; a brightened cap counts as a shape change.
- Check role colour pairs under deuteranopia and protanopia, and in three viewing conditions.
- Keep labels at 4.5 : 1 on the rendered panel.
- Name the three viewing conditions (a colour-managed monitor in daylight, a cheap laptop at 30% brightness in a dark room, the OS invert colours), measure contrast on the rendered panel in each, and give controls names the host's accessibility API can read.

Never do:
- Show an original's state by colour alone.
</constraints>
