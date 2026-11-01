---
name: prove-instances-identical
description: Use when a container type (slot, oscillator, voice, layer, lane, band) is added or changed, when a step touched one instance, or before calling such a step done.
---

# Prove the instances identical (one job: the swap test for a container type)

Identical containers are one code path addressed by an index (`instances-by-index-identities-by-id`). The proof is behavioural: swap
two instances and nothing may change except which index holds what.

<constraints>
Always do:
- Build the swap test for the container type once, as a probe or test with a planted fault, and run it for EVERY pair of instances
  (for four slots: the six pairs). For each pair: load a state, swap the two instances' contents, run the same input, and compare with
  the indices swapped back:
  - the sound, bit for bit (a render through the real processor, effects and their tails included);
  - the picture (what the window or the off-screen render draws for each instance, swapped);
  - the state (every parameter and every piece of instance state, by generated ID);
  - the bindings (every control of each instance reaches the same function: the press map, the host parameters, undo).
- Check the records first: every instance has the same fields (parameters, press-map rows, effects, moons). A field one lacks is
  appended at the end of its record, never inserted, so frozen IDs never move.
- Check the IDs: the generator (`slotId(i, field)`) produces exactly the frozen lock's string for every instance and field.
- Plant the fault the test exists for: one instance given its own path (a branch on its index, a field the others lack) must turn it red.
- Report each difference by where it lives: a code path, a record field, a wiring.

Never do:
- Prove a change on one instance and call it done.
- Accept "the instances are the same code" without the swap test's numbers.
</constraints>
