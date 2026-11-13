---
name: byte-reach
description: Use when a patch decode needs a progress number, or when asking how much of a stored record is still unmapped.
---

# Count the bytes that reach the sound (one job: the deaf count as the progress number of a decode)

<constraints>
Always do:
1. Perturb every byte of every record and render; count the bytes that change no sound (the deaf count).
2. Report the deaf count with each step: it must fall as the map grows.

Never do:
- Report progress as lines of notes instead of bytes mapped.
</constraints>
