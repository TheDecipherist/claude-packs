---
# concepts: ui, painter, panel-spec
paths:
  - "placeholder"
---

# A sub-section starts with a header bar, and its lamp is its kill switch

A lamp that does not switch the section off is a decoration, and a user cannot trust any lamp after one.

<constraints>
Always do:
- Start each sub-section with a header bar: its title on the left, `ON` and a lamp on the right.
- Make the lamp the module's kill switch: off, the output is bit-identical whatever its controls say (`module-kill-switch`).

Never do:
- Put a lamp on a section that has no kill switch behind it.
</constraints>
