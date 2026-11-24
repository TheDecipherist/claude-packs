---
# concepts: cpp, js, python, tooling
paths:
  - "placeholder"
---

# The engine resets as the machine does, before every patch and at startup

A patch applied over what the last one left sounds different on every recall. The reset is the one the machine makes, mapped by `find-the-reset`, not a guess. One rebuild's program load called a reset that released the notes and nothing else: the comb's delay lines rang on from the last program into the next, and the check below passed, because the load did call a reset.

<constraints>
Always do:
- Make the engine's reset do exactly what the `find-the-reset` map lists, entry for entry, in its order, and call it first in every function that applies a patch and at startup.
- Give every stateful module of the engine its fate on a patch load in the reset map: every filter, comb, delay line, reverb tank, distortion, EQ, chorus, LFO phase, glide source and arpeggiator position, "cleared" or "carried", each with the source that says so (the firmware's reset path, or the schematic on an analog machine). A module with no fate in the map is a fault, whatever the reset does: run `reset-census` over the engine's folders.
- Return every parameter the new patch does not set to its default. A load writes the whole parameter set: the record's values, and the default for each parameter the record omits, never the value the last patch left.
- Default every switch and exclusive group to off. A patch that omits a section leaves it silent.
- Keep a census: each switch with its reset value, read from the map.
- Prove the reset in sound: play a patch that excites every stateful module (a high comb feedback, a long delay and reverb), load another, and find no ring of a cleared module in the new patch's output, and the ring of each carried one; plant the module's reset out of the load and see the gate red.

Never do:
- Apply a patch with no reset before it, or default a switch on.
- Reset more or less than the map says: "clear everything" is a guess.
- Take a reset call in the load as proof the load resets: the census and the sound gate are the proof.
</constraints>

## Check
`reset-before-apply` refuses a patch-apply function with no reset call in its body. `reset-census` (sound-design's tool: `node .claude/tools/reset-census.mjs <reset-map.json> <engine folders>...`) fails a stateful module (a class that declares a reset()) the map gives no fate, an entry with no fate or no source, and an entry naming no module.
