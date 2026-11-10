---
# concepts: audio, dsp
paths:
  - "placeholder"
---

# `prepareToPlay` can run any number of times and always leaves a clean state

<constraints>
Always do:
- Treat `prepareToPlay` as callable repeatedly, with or without `releaseResources` in between, and with a new sample rate or block size each time.
- Re-prepare and reset every DSP object unconditionally: filters, delay lines, reverb tanks, smoothers (`reset(sampleRate, ramp)`), voices and oversamplers.
- Size scratch buffers with margin for blocks larger than announced, and split larger blocks internally.

Never do:
- Skip work because "already prepared". A changed rate must rebuild everything rate-dependent.
- Leak or double-allocate when `prepareToPlay` is called twice without `releaseResources`.
</constraints>

## Check
Tests:
1. Prepare at 48 kHz/512, then 96 kHz/64, then 44.1 kHz/1024 with no release in between. Render each time; pass when the output matches a freshly constructed processor and ASan reports no leaks.
2. Prepare at N, process blocks of 2N under ASan. Pass: no reports.
