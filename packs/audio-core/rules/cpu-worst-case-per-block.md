---
# concepts: audio, bench
paths:
  - "placeholder"
---

# CPU is judged by the worst block, not the average

<constraints>
Always do:
- Gate on p99, p99.9 and maximum block time, plus the count of blocks over their deadline (`numSamples / sampleRate`), at 1, 8, 32 and 96 voices, with the heaviest patch and every row of the matrix moving.
- Include a program load (or any preset change) as its own case, at every sample rate: clearing delay memory on the audio thread overran every load at 96 kHz, and no steady-state block showed it.
- On a shared machine, separate the code from the scheduler. A wall clock counts what the host and hypervisor take, and thread CPU time hides it. A deterministic engine repeats its own cost on the same block, so take the least time per block over a few passes. Run a control with no engine through the same clock, and read the engine's figure against it.
- Include the note-on block (voice start, envelope and filter init) and a held chord of idle voices as their own cases: a note-on costs more than a steady block, and idle voices cost what they run.
- Include digital silence and "identical left and right" as their own cases. Silence can cost more than signal (denormals, gates).
- Label every CPU figure with what it measures (callback duty, one core, or process CPU), sample rate, block size, and whether the editor was open.
- Attribute cost before optimising: compare editor closed vs open, bypassed vs active, silence vs signal.
- Build the benchmark with the plugin's exact compile and link flags (including LTO), constructing the engine the same way it ships (heap, not stack).
- Touch every pre-allocated buffer once in `prepareToPlay` so the first callbacks don't stall on page faults.
- Look at the curve across voice counts. Anything worse than linear growth is a bug.
- Replace a work order's cost-ledger estimate (`synth-cost`) with the W0 measurement of one INIT voice, worst block, at 44.1 kHz and 48 kHz, and hold the gate to the measured figure from then on.
- Before approximating, remove work that is thrown away and read the call tree; where worker threads share a sum, order it and run ThreadSanitizer.

Never do:
- Report average CPU as the performance figure.
- Compare numbers from different benchmark-harness versions. When the harness changes, re-time the old build with the new harness.
- Time code with anything that logs from inside `processBlock` (JUCE's `PerformanceCounter` writes to the logger).
</constraints>

## Check
Benchmark test, offline render: 96 voices at 48 kHz with 64-sample blocks. Pass (house choice): p99.9 under 50% of the deadline, and zero overruns, by the least time per block where the machine is shared.
