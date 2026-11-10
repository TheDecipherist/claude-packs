---
# concepts: records, params, world
paths:
  - "placeholder"
---

# Reset is generated from the records, never written by hand

From spec §0 rule 5.

<constraints>
Always do:
- Declare every piece of patch state once in the records, with its starting value. The reset is generated from that list, and state without a starting value must not compile.
- Treat a patch load as a reset followed by an apply, so nothing survives from the previous patch.
- Make reset clear motion too: every mover, note in flight and shatter piece. Every held note gets its note-off.
- Keep MAIN volume, octave, the wheel positions, LIMIT and SETTINGS outside the patch, as the patch law says.

Never do:
- Write a reset by hand, or add a field to a hand-made list.
- Plant state in a member variable that isn't declared in the records.
</constraints>

## Check
Reset gate: move every control and every piece of patch state away from its start, set the world moving with notes in flight, then reset. The render must be bit-identical to a fresh INIT. Plant the fault (one field outside the list) and the gate must show red.
