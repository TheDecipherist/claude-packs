---
# concepts: ui, painter, panel-spec
---

# Sizes and type come from one table of tokens, by kind of control, measured from the house reference plugin

Every number is in design units: the panel is 1,400 wide, and the on-screen scale is never below 1.0.

<constraints>
Always do:
- Size a knob by its kind: hub radius 35, column knob 26, a knob between two hubs 16, satellite 14, button 14, mini 7. A hub is about twice its satellite.
- Make caption bars 22 high, chips 34 to 61 wide by 16 to 19 high, time windows 96 by 52.
- Set type by its job: a column's foot name in the 28 class, bold; bar labels 13 to 15; plate labels 16; a knob's name about 13, its value about 12, a satellite's name 9. The floor is 9 for a satellite's name and 13 for everything else.
- Use one condensed family: names in uppercase, a selector's values in mixed case, no italics.
- Keep 8 units between any two pieces of text, and 14 between a section's name and its lamp.
- Keep every number a token in one place, read by name: change it there and every panel follows.
- Hold each of these as a row of the look gate (`ui-matches-reference-look`): radius by kind, the hub to satellite ratio, the type floors, the gap between texts and the needle's contrast, each with its tolerance.

Never do:
- Size a control by eye, or write one of these numbers into a unit's code.
- Draw text under its floor, or shrink a control to fit: the container scrolls.
</constraints>
