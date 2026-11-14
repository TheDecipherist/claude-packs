---
name: find-a-sequence
description: Use when stored music (a pattern, a demo song, a sequencer ROM) must be found in an image and proven.
---

# Find a sequence by its signature (one job: locate stored music, prove it by arithmetic)

<constraints>
Always do:
1. Find the record shape: an offset that is zero in every record picks the stride and phase; notes fall in 24 to 100 and velocity in 1 to 127.
2. Prove by arithmetic: deltas sum to whole bars (96 ticks per 4/4 bar at 24 PPQN; 384 for a four-bar pattern) on every pattern.
3. Record the format, never the notes (`firmware-stays-out`).

Never do:
- Call a run a sequence before its bars sum.
</constraints>
