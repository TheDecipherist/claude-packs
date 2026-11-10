---
# concepts: painter, ui
paths:
  - "placeholder"
---

# Frames are drawn only when something changes, at the lowest rate that looks right

<constraints>
Always do:
- Render only when something changed: a parameter, live audio data (waveform, spectrum), travellers in flight, idle motion, or hover and drag. With nothing changing, present nothing.
- Run idle animation at 60 Hz. Allow 120 Hz only while the player is dragging or interacting.
- On Mac, drive frames from the display link (`CAMetalDisplayLink`, macOS 14+) with a preferred frame-rate range on whole-number divisions (120, 60, 30). Respect Low Power Mode and thermal state.
- Calm mode: 30 Hz, fewer particles, dual-Kawase bloom. Also honour the OS reduce-motion setting.
- Stop rendering (0 Hz) for hidden or covered editors.

Never do:
- Render continuously at the display maximum by default.
- Keep the GPU busy for a static, unchanged window.
</constraints>

## Check
Bench (house targets):
- A static idle window presents 0 frames per second.
- Animated idle costs ≤ 2 ms GPU per frame on the M1 Pro.
- With 8 editors open, render-thread CPU totals ≤ 5%.
- Compare GPU power at 60 and 120 Hz with `powermetrics`.
