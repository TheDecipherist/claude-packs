---
name: gpu-golden-check
description: Use after any painter, shader or look change, and before calling visual work done.
---

# Golden image check (one job: did what the user sees change?)

## Steps
1. Run the project's `picture-gates` command (CLAUDE.md, Project commands): the golden-image tests (fixed seed, time and size; 1x and 2x; per-platform goldens).
2. For each failing scene, open the saved diff image and the rendered image.

## Report
Each scene with its mean and 99th-percentile FLIP and PASS/FAIL (threshold from `gpu-golden-images.md`), and a one-line description of what visibly changed in each failure. Never update goldens here. If the change was intended, say so and stop; the user runs `gpu-golden-update`.
