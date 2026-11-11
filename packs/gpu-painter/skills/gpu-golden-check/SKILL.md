---
name: gpu-golden-check
description: Use when any painter, shader or look change is made, and before calling visual work done.
---

# Golden image check (one job: did what the user sees change?)

<constraints>
Always do:
1. Run the project's `picture-gates` command (CLAUDE.md, Project commands): the golden-image tests (fixed seed, time and size; 1x and 2x; per-platform goldens).
2. For each failing scene, open the saved diff image and the rendered image.

Never do:
- Update the goldens in this skill.
</constraints>

## Report
Each scene with its mean and 99th-percentile FLIP and PASS/FAIL (threshold from `gpu-golden-images.md`), and a one-line description of what visibly changed in each failure. Never update goldens here. If the change was intended, say so and stop; the user runs `gpu-golden-update`.
