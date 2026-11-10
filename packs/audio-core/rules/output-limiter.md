---
# concepts: dsp
paths:
  - "placeholder"
---

# The output limiter never lets a sample past its ceiling and reports its latency

<constraints>
Always do:
- Compute gain as the minimum over the look-ahead window with a sliding-window minimum (monotonic deque, O(1) per sample), then smooth the release.
- Link stereo: detect on max(|L|, |R|).
- Report the latency once, as a constant: `setLatencySamples(round(0.001 · fs) + oversamplerLatency)` in `prepareToPlay`.
- If the ceiling is ever advertised as dBTP, detect true peak with 4x oversampling (ITU-R BS.1770). A sample-peak limiter can overshoot by about 0.5 dB between samples.

Never do:
- Make the ceiling or look-ahead user controls (house law: −0.3 dBFS, 1 ms).
- Change the reported latency while running.
</constraints>

## Check
- Test: a sweep plus an inter-sample-peak signal (fs/4 sine at 45° phase). Max sample ≤ −0.3 dBFS; if dBTP is claimed, true peak at 4x ≤ the ceiling.
- Null test: with the limiter idle, output minus input delayed by the reported latency is silent.
