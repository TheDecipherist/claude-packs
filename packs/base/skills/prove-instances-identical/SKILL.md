---
name: prove-instances-identical
description: Use when a container type (slot, oscillator, voice, layer, lane, band) is added or changed, when a step touched one instance, or before calling such a step done.
---

# Prove the instances identical (one job: the generated gate shape_symmetry for a many concept)

Identical containers are one code path addressed by an index (`instances-by-index-identities-by-id`). Which concepts are many is
written in `design/shape.json`, never guessed from folders. The proof is the gate the kit generates from that manifest,
`shape_symmetry.<concept>`: every instance has the same members, and a swap between every pair changes nothing but the index.

<constraints>
Always do:
- Give the concept its row in `design/shape.json` first (`"shape": "many"`, `count`, `generator`, `owns`), with a `symmetry` block of two
  commands the project provides; the kit never writes the project's test:
  - `members`: prints instance `{i}`'s members, one per line: every parameter ID, effect, planet, moon, press-map row it owns;
  - `swap`: exits 0 when instances `{i}` and `{j}` swap the same: load a state, swap the two instances' contents, run the same input,
    compare with the indices swapped back: the sound bit for bit (effects and tails included), the world, the picture, the state
    (every parameter by generated ID) and the bindings (press map, host parameters, undo).
  - `first` (default 0) when instances are counted from 1; `instances` (a command printing N) for a many concept with no fixed count.
- Generate the tests at configure time, never by hand. CMake:
  `execute_process(COMMAND node ${CMAKE_SOURCE_DIR}/.claude/tools/shape-symmetry.mjs gen --dir ${CMAKE_SOURCE_DIR} --cmake ${CMAKE_BINARY_DIR}/shape_symmetry.cmake COMMAND_ERROR_IS_FATAL ANY)`
  then `include(${CMAKE_BINARY_DIR}/shape_symmetry.cmake)`. Any other build system: `npx --no-install @thedecipherist/claude-packs symmetry gen --list` prints one
  `<name><TAB><command>` line per many concept.
- Run it: `ctest -R shape_symmetry` or `npx --no-install @thedecipherist/claude-packs symmetry run <concept>`. Read every line: it names what instance i has that j
  lacks, and prints every pair it checked (6 for N = 4).
- Plant the faults the gate exists for and see it red: one instance missing a member, one pair that swaps differently.
- Check the IDs: the generator produces exactly the frozen lock's string for every instance and field.
- Report each difference by where it lives: a code path, a record field, a wiring.

Never do:
- Prove a change on one instance and call it done.
- Accept "the instances are the same code" without the gate's readings.
- Scope the proof to a folder ("the engine"): the world, the painter, the bank and the tests hold instances too.
- Write a hand-made swap test per concept in place of the generated one.
</constraints>
