---
name: gpu-lifecycle-stress
description: Use after changing how the view, surface, device or render thread start or stop.
---

# GPU lifecycle stress (one job: prove the 3D view starts and stops cleanly)

## Steps
1. Build the AddressSanitizer configuration of the standalone with the project's `build` command (and later the plugin, in a test host).
2. With audio rendering at 96 voices, open and close the editor 100 times, hide and show it, and change the display scale (1x/2x).
3. Run 8 instances at once in the host.
4. Record ASan reports, leaks, audio overruns, and render-thread CPU after the last close.

## Report
Pass only if: no ASan reports, no leaks, zero audio overruns, and render CPU of 0 with the editor closed (`gpu-render-lifecycle.md`). For any failure give the stack and the lifecycle step it happened in. Don't change code in this skill.
