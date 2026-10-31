---
# concepts: painter, shaders, tests
paths:
  - "placeholder"
---

# What the 3D space looks like is proven by golden images

<constraints>
Always do:
- Render fixed scenes offscreen (fixed seed, fixed time, fixed size) at 1x and 2x scale, with fixed time, fixed seed and dithering off. Read them back in the test harness and compare against stored goldens kept per backend (Metal and Direct3D 12 differ in derivatives and precision). Compare with NVIDIA's ꟻLIP (BSD-3, single-header C++), not PSNR. Pass (house): mean FLIP ≤ 0.01 and 99th percentile ≤ 0.1 per scene; on the same machine and driver, repeat renders are bit-identical.
- Prove visual changes through the real user-facing path: the standalone with the real editor. Logs or JSON saying "rendered" prove nothing about what the user sees.
- Update goldens only for an intended visual change, with before and after images shown to the user (`gpu-golden-update` skill).

Never do:
- Mark a visual task done because the code compiles or the logs look right.
- Regenerate goldens to make a failing test pass.
</constraints>

## Check
`gpu-golden-check` skill runs the image-diff tests. They fail over the FLIP thresholds and save the FLIP error heatmap.
