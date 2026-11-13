---
# concepts: dsp
paths:
  - "placeholder"
---

# A NaN or Inf can never live in recursive state

<constraints>
Always do:
- Once per block, check the state of every recursive structure (filter integrators, delay feedback, reverb tank, ZDF solver) with `std::isfinite`. On failure, reset that state (or the whole voice) to zero, and bump a debug counter.
- Debug builds: `jassert(std::isfinite(x))` after each stage of a voice.

- Cover the limiter's state in the same guard, and let the probe count NaN samples in its output (the count is the result, not a pass or fail on one block).

Never do:
- Rely on `std::clamp`, `jlimit` or a soft clipper to remove a NaN. They pass NaN through unchanged.
- Zero only the output while a NaN stays in a filter state. It keeps re-emerging forever.
</constraints>

## Check
Test: inject a NaN into a filter state mid-block. Pass: the next block's output is finite and the reset counter went up by one.
