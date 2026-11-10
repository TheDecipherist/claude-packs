---
# concepts: painter, shaders
paths:
  - "placeholder"
---

# Draw order: opaque, then additive glows, then sorted transparency, then overlay

<constraints>
Always do, in this order:
1. Opaque planet bodies, with depth write.
2. Emissive glows, travellers, trails and the nebula as additive blending (One, One), with depth test on and depth write off. Addition doesn't care about order, so these need no sorting.
3. The few truly transparent surfaces (the crystal, tags) sorted back to front per object on the CPU.
4. The 2D overlay (columns, menus, readouts) last, in its own pass.

Never do:
- Use alpha blending for glows (they need sorting and still go wrong).
- Add order-independent transparency. Weighted blended OIT is an approximation with tuning cost, only worth it with many overlapping coloured alpha layers, which Stellix doesn't have.
</constraints>

## Check
Golden test: the additive set rendered in permuted order gives an identical image.
