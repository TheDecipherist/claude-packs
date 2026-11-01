---
name: gpu-frame-bench
description: Use when the space stutters or feels slow, after painter or shader changes, or before merging GPU work.
---

# GPU frame bench (one job: is the renderer inside its budget?)

## Steps
1. Build Release with the shipping flags, then run the project's `frame-bench` command (CLAUDE.md, Project commands) on the reference scenes, at 1x and 2x scale, with audio running at 96 voices.
2. Read its JSON: p99 GPU ms (Dawn timestamp queries, opt-in, resolved and read back a frame or two later; the gpu-frame-budget rule), p99 render-thread CPU ms, draw calls per frame, bytes uploaded per frame, and the validity flag of each counter.
3. Compare against `.claude/rules/gpu-frame-budget.md` (judged on the M1 Pro with 4 copies open; house proposal GPU ≤ 8 ms, painter CPU ≤ 2 ms at p99 until the work order sets numbers) and `gpu-frame-work.md` (≤ 50 draw calls).

## Report
One row per scene with each figure and PASS/FAIL. Read the pattern before guessing a cause: low GPU but high frame time means sync or present pacing, and times bunched at the display interval mean vsync. Treat an invalid counter as a FAIL, never as 0. Don't change code in this skill.
