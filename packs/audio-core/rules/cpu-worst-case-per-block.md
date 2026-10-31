---
# concepts: audio, bench
paths:
  - "placeholder"
---

# CPU is judged by the worst block, not the average

<constraints>
Always do:
- Gate on p99, p99.9 and maximum block time, plus the count of blocks over their deadline (`numSamples / sampleRate`), at 1, 8, 32 and 96 voices, with the heaviest patch and every row of the matrix moving.
- Include digital silence and "identical left and right" as their own cases. Silence can cost more than signal (denormals, gates).
- Label every CPU figure with what it measures (callback duty, one core, or process CPU), sample rate, block size, and whether the editor was open.
- Attribute cost before optimising: compare editor closed vs open, bypassed vs active, silence vs signal.
- Build the benchmark with the plugin's exact compile and link flags (including LTO), constructing the engine the same way it ships (heap, not stack).
- Touch every pre-allocated buffer once in `prepareToPlay` so the first callbacks don't stall on page faults.
- Look at the curve across voice counts. Anything worse than linear growth is a bug.

Never do:
- Report average CPU as the performance figure.
- Compare numbers from different benchmark-harness versions. When the harness changes, re-time the old build with the new harness.
- Time code with anything that logs from inside `processBlock` (JUCE's `PerformanceCounter` writes to the logger).
</constraints>

## Check
Benchmark test, offline render: 96 voices at 48 kHz with 64-sample blocks. Pass (house choice): p99.9 under 50% of the deadline, and zero overruns.
