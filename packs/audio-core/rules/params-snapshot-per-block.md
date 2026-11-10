---
# concepts: audio
paths:
  - "placeholder"
---

# Each block reads its parameters once, into a plain snapshot

<constraints>
Always do:
- At the start of each block, copy the parameters into a plain-data snapshot with relaxed atomic loads. Use a dirty bitset set by `parameterValueChanged`, so only changed values are copied when there are thousands.
- Make the world, the voices and the DSP read only from that snapshot within the block, so every value is consistent for the whole block and the world stays deterministic.
- Ramp continuous values inside the block with the per-sample smoothers.

Never do:
- Read parameter atomics directly in the middle of the world tick or a voice loop. A host write mid-block makes one block see two values.
</constraints>

## Check
- ThreadSanitizer stress test: the UI and host automation write 4k parameters while audio renders. No races.
- `juce-realtime-audit` reports no parameter reads outside the snapshot step.
