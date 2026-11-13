---
# concepts: params
paths:
  - "placeholder"
---

# A patch stores every setting except the performance controls

<constraints>
Always do:
- Store every sound setting in a patch, effect choices included (reverb room, delay program, routing).

- Treat selectors and edit-focus controls (which slot, which page, which edit target) as session state: they are not in a patch.
- Decide solo and bypass by a written choice: they clear on load or they stick, and the choice is written down.
- Store routes as patch data: a modulation or routing assignment is part of the sound.

Never do:
- Store MAIN volume, octave, the mod wheel or the pitch wheel in a patch. Those belong to the player and the session, not the sound, so loading a patch never changes them.
</constraints>

## Check
Test: set MAIN volume, octave, mod wheel and pitch wheel to non-default values, save a patch, change all four again, and load the patch. Assert all four kept their current values and that none of the four IDs appear in the saved data.
