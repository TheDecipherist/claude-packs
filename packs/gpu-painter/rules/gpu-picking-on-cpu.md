---
# concepts: ui, painter
paths:
  - "placeholder"
---

# Hover and drag picking is a CPU ray test against the frame's own transforms

<constraints>
Always do:
- Pick with a CPU ray against spheres (or capsules for rings and paths), using the planet and moon transforms of the same frame the renderer drew.
- Resolve hover within the same frame the mouse moved in.

Never do:
- Pick by reading back a GPU ID buffer. The readback lands at least a frame late, adds a stall or copy, and buys nothing for about 50 objects.
</constraints>

## Check
Unit tests with a fixed camera and positions: hits are exact at sphere edges ±0.5 px, and hover changes in the same frame.
