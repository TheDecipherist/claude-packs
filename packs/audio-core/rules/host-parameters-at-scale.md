---
# concepts: params
paths:
  - "placeholder"
---

# Host parameters stay bounded, collision-free, and recorded as gestures

<constraints>
Always do:
- Keep the exported parameter count bounded (house cap: about 2048). For Stellix, export generic slot parameters (4 slots × a fixed number of moon slots, with meaning taken from the planet's kind) rather than the union of every kind's moons. IDs stay fixed and the count stays bounded.
- Test that no two parameter IDs collide after hashing. JUCE's VST3 ID is `String::hashCode() & 0x7fffffff` (with Studio One compatibility); the AU ID is the unmasked hash. Both wrappers only `jassert` on a collision.
- Wrap every drag: `beginChangeGesture()` on mouse-down, `setValueNotifyingHost()` while dragging, `endChangeGesture()` on mouse-up, so hosts record automation cleanly.
- Mark internal or derived values non-automatable, or keep them out of host parameters entirely.
- Put parameters in groups (`AudioProcessorParameterGroup`) by slot and planet, so host lists stay navigable.

Never do:
- Change an exported ID string after release (the `parameter-ids-never-change` lock guards this).
- Export per-kind moons whose existence depends on the slot's current kind.
</constraints>

## Check
- Test: every exported ID's VST3 and AU hash is unique, and the count is within the cap.
- pluginval at strictness 10, and `auval -v` finishing in under 30 s (VST time).
