---
# concepts: audio, dsp
paths:
  - "placeholder"
---

# Sample rate and block size always come from the host

<constraints>
Always do:
- Derive every time-based value (delay samples, LFO increments, envelope coefficients, smoothing ramps, tempo-synced rates) from the `sampleRate` given to `prepareToPlay()`, and recompute it there.
- Handle any `buffer.getNumSamples()`, including 0, and blocks of varying size on every call.
- Program defensively for a block *larger* than `maximumExpectedSamplesPerBlock`: process it in chunks no bigger than what you prepared. JUCE's own docs warn that buggy hosts can exceed it.
- Test at 44.1, 48, 96 and 192 kHz.

Never do:
- Write `44100`, `48000`, `96000` (or `44100.0f` etc.) in DSP code as a rate.
- Assume the block size equals the prepared maximum, or is a power of two.
</constraints>

## Check
- The realtime-guard hook flags literal sample rates inside audio-thread bodies.
- Test: render the same patch at 44.1 and 96 kHz and assert that the delay time in milliseconds and the LFO period in milliseconds match. Render with block sizes 1, 7, 64 and 4096 and assert identical output.
