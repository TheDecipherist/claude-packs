---
# concepts: world, tests
paths:
  - "placeholder"
---

# Every hit inside a tick is found exactly once and placed at its sample

From spec 6.0 and 7.3: the tick never quantises time.

<constraints>
Always do:
- Sweep each traveller across the tick. A formula curve is split into a fixed number K of substeps (fixed K keeps it deterministic), and each chord is swept against every sphere in reach.
- Solve segment against sphere with the numerically stable quadratic: `q = −½(b + sign(b)·√disc)`, roots `c'/q` and `q/a` (Ericson, *Real-Time Collision Detection* §5.3). Take the smallest `t` in [0, 1).
- Keep a contact state per traveller/planet pair. A hit fires on the *entering* transition only; a traveller starting inside counts once, at t = 0.
- Use a skin tolerance relative to the radius, and settle simultaneous hits by pair ID.
- Convert `t` to a sample with integer or fixed-point arithmetic: `tickStartSample + floor(t · samplesPerTick)`.

Never do:
- Test only the end position of a tick (fast travellers tunnel through small moons).
- Let a resting contact fire again every tick.
</constraints>

## Check
- Test: a traveller at 10x the fastest launch speed crosses a sphere of the smallest radius. Exactly one event, at the analytically expected sample, ±0.
- Test: grazing paths (tangent, ±1 skin) give the same verdict on both platforms (part of the cross-platform event-log gate).
