---
# concepts: audio, ui
paths:
  - "placeholder"
---

# A thread or process boundary is tested from both sides at once

<constraints>
Always do:
- For every handoff between the audio thread and the UI (lock-free FIFO, snapshot ring, atomics), write at least one test that runs both sides together: the audio side publishes, and the test asserts the UI side observes exactly that (value, order, no drops at the stated rate).
- Do the same for anything that crosses a process (a render probe the test spawns, a plugin host): assert the parent sees what the child recorded.

Never do:
- Count two one-sided tests (the producer writes, the consumer reads a fake) as covering the boundary. That is how a flag set on one side never reaches the other.
</constraints>
