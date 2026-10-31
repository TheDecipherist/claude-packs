---
# concepts: audio
paths:
  - "placeholder"
---

# Every `processBlock` starts with `ScopedNoDenormals`

<constraints>
Always do:
- Make `juce::ScopedNoDenormals noDenormals;` the first line of every `processBlock` (and `processBlockBypassed` if it processes audio).

- Use `ScopedNoDenormals` on *every* thread that runs DSP: worker threads that render voices, offline renders, and test and benchmark executables. The flag belongs to one thread only.
- Define `JUCE_DSP_ENABLE_SNAP_TO_ZERO=0` in CMake. JUCE's `JUCE_SNAP_TO_ZERO` only does anything on Intel (it's a no-op on Arm), so `juce::dsp` filters otherwise give block-size-dependent output on x86 and not on Apple Silicon.

Never do:
- Rely on calling `FloatVectorOperations::disableDenormalisedNumberSupport()` in `prepareToPlay()`. It sets the flush-to-zero flags of the CPU register on the *calling* thread (JUCE source: MXCSR on Intel, FPCR on Arm), and hosts may call `prepareToPlay` on a different thread from the audio callback.
- Add tiny DC offsets (`+ 1e-20f`) as the denormal fix in new code. Use the scoped flag; it covers every filter, reverb tank and feedback path at once.
</constraints>

## Why
Decaying feedback (reverb tails, filter states, delay feedback after the note stops) drifts into denormal range, and on some CPUs each denormal operation is many times slower. The symptom is a CPU spike when the sound goes *quiet*.

## Check
- The realtime-guard hook blocks any edit that leaves a `processBlock` body without `ScopedNoDenormals`.
- `.claude/checks/juce-snap-to-zero-off.json` blocks removing the define once it's in `CMakeLists.txt`.
