---
# concepts: shaders, painter
paths:
  - "placeholder"
---

# Thin lines are antialiased in the shader; MSAA only for silhouettes

<constraints>
Always do:
- Draw orbit rings, ghost paths, border lines and the UI as instanced quads or signed-distance shapes, with analytic coverage: distance divided by `fwidth`, smoothed over about 1 pixel.
- Use 4x MSAA only for planet and crystal silhouettes (WebGPU allows 1 or 4). On Apple GPUs, give the MSAA colour and depth attachments transient usage so they stay in tile memory.

Never do:
- Use TAA (ghosting on moving thin lines) or FXAA (blurs text).
- Draw hairlines as 1-pixel GPU lines and hope.
</constraints>

## Check
Golden test: a 0.5–1 px ring at 1x and 2x shows no stair-steps; frame-to-frame FLIP on a slow rotation stays below 0.01 (no shimmer).
