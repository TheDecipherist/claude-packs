---
# concepts: painter, bench
paths:
  - "placeholder"
---

# The space meets its frame budget on the minimum machine, with several copies open

From spec §7.3 and §9.

<constraints>
Always do:
- Judge every budget (world, painter, audio) on the **minimum machine, an Apple M1 Pro (2021)**. The development machine (M5 Max) is never the judge. There's no Intel or Rosetta build.
- Measure the two budgets separately: the world tick against the audio budget (96 held notes, every border open) and the drawing against the frame budget. A test that runs the world inside the frame reports both numbers, never one.
- Measure with several copies of Stellix open at once. They share one Dawn device and one render thread, so one slow copy delays the others.
- Measure GPU time with Dawn's `TimestampQuery` feature at pass boundaries, resolved and read back one or two frames later so the read never stalls. Dawn quantises timestamps by default (`timestamp_quantization` toggle); turn that off in bench and dev builds. Measure render-thread CPU time around the frame.
- Report GPU time and painter-thread CPU time at p99. A counter that didn't run is *invalid*, never 0 ms.
- Read the pattern: GPU time low but frame time high means sync, driver wait or present pacing. Times bunched at the display interval mean vsync.

Never do:
- Judge performance on the dev machine, by eye, or by average FPS.
</constraints>

## Check
`gpu-frame-bench` on the M1 Pro: p99 within the budget numbers in the work order. House proposal until those are set: GPU ≤ 8 ms and painter CPU ≤ 2 ms at 2x scale, with 4 copies open. The CPU gate from `gpu-frame-work.md` must pass too.
