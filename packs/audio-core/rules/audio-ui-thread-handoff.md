---
# concepts: audio, ui
paths:
  - "placeholder"
---

# Audio and UI threads talk only through atomics and lock-free FIFOs

<constraints>
Always do:
- UI → audio: write plain values to `std::atomic<T>` (with `is_always_lock_free` true), or go through the parameter system.
- Audio → UI (meters, playheads, matrix position, scope data): the audio thread writes atomics or pushes into a pre-sized `juce::AbstractFifo` ring; a `juce::Timer` on the message thread polls and repaints.
- Pass complex objects (a rebuilt wavetable, a new route list) by building them on the message thread and handing over a pointer through a lock-free swap or FIFO. Free the old one on the message thread.

Never do:
- Call `repaint()`, touch the editor, `getActiveEditor()`, `MessageManager`, `callAsync`, `sendChangeMessage()` or `triggerAsyncUpdate()` from the audio thread. `triggerAsyncUpdate()` posts to the OS message queue when an update isn't already pending, and that path isn't guaranteed lock- or allocation-free.
- Share a `std::vector`, `juce::Array` or `ValueTree` between threads where one side may modify it.
</constraints>

## Check
The realtime-guard hook flags these UI and message calls inside audio-thread bodies. For cross-thread container sharing, use ThreadSanitizer in a debug build (`-fsanitize=thread`), which reports the data race at runtime.
