---
# concepts: audio
paths:
  - "placeholder"
---

# A stolen voice fades out; it is never cut

<constraints>
Always do:
- When every voice is busy, steal by a stated policy (released voices first, then the quietest, then the oldest), and fade the stolen voice over a short fixed ramp (about 1 to 5 ms) before restarting it.
- Reset filter and envelope state cleanly when the voice restarts, after its fade completes.
- Keep the voice count fixed and allocated in `prepareToPlay()`. Stealing never creates a voice.

Never do:
- Restart a sounding voice instantly at full level (a click on every steal).
- Pick the voice to steal by array index alone.
</constraints>

## Check
Test: fill all voices with held notes, play one more, and assert no sample-to-sample jump in the output exceeds the same threshold the smoothing test uses.
