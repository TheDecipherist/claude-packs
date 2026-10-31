---
# concepts: shaders, painter
paths:
  - "placeholder"
---

# Bloom is a thresholdless mip pyramid with firefly suppression

<constraints>
Always do:
- Use the Jimenez (Call of Duty: Advanced Warfare) chain: downsample the HDR target over 5–6 levels from half resolution, with the Karis 1/(1+luma) weighted average on the first downsample only; upsample with a 3×3 tent, adding each level as it goes; composite at low strength (around 0.04).
- In calm mode, use the cheaper dual-Kawase chain at reduced strength.

Never do:
- Use a brightness threshold (pops as values cross it), or a single wide Gaussian at full resolution.
- Skip the Karis weighting. Small hot pixels (travellers, text glows) flicker without it.
</constraints>

## Check
`gpu-frame-bench`: bloom p99 ≤ 0.5 ms GPU on the M1 Pro at 2x (house target), and no frame-to-frame flicker in a slowly moving scene (FLIP between frames below 0.01).
