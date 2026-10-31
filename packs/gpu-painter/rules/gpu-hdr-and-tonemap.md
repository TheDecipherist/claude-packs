---
# concepts: painter, shaders
paths:
  - "placeholder"
---

# Render in linear HDR, tonemap once with PBR Neutral, output sRGB

<constraints>
Always do:
- Render the space into an `rgba16float` target in linear light.
- Run one final pass: exposure, then Khronos PBR Neutral (identity below its compression start, so the slot colours stay true; only highlights compress), then write to a `BGRA8Unorm` surface encoded as sRGB.
- Keep the slot colours (amber, cyan, magenta, green, white) defined once, in linear, in the records.

Never do:
- Use ACES (shifts hues) or AgX (desaturates) on a palette that has to read as exact slot colours.
- Turn on EDR or wide colour in v1. Dawn currently rejects surface colour management, and very bright output next to a DAW is hostile. Display P3 can come later on Mac through the `CAMetalLayer`'s colour space.
- Tonemap in more than one place.
</constraints>

## Check
- Golden swatch-and-gradient scene: after 8-bit output, Mac and Windows agree within ±1 LSB.
- Test: PBR Neutral returns its input within 1/255 below 0.76.
