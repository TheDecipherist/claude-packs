---
# concepts: cpp, tests, notes, plan
paths:
  - "placeholder"
---

# Identical containers by index, different things by ID; never a literal of either in logic

Learned on Stellix (2026-10-31, B-175, B-177, B-178, B-200): its four sound slots are identical containers, yet one slot had its own
effects chain, its own effect moons, the only multi-core voices, the only push laws, the only ARP controls in the press map and its own
set of effect parameters, because the first build played that slot and every later step, test and agent brief named it. The checks were
scoped to the engine folders, so the world and space code left two slots without their effects (B-200). Tim: "slots are index based.
it shouldnt matter if you swap one."

<constraints>
Always do:
- Read the scope from `design/shape.json`, never from a folder list. A concept the manifest calls `many` is judged in every source,
  test, doc, brief and recipe, wherever it is named; a container type with no row there gets its row first (one or many, its
  generator, its selectors, its declared constants, what each instance `owns`, its `symmetry` commands).
- Treat identical containers (slots, oscillators, voices, layers, lanes, bands) as instances of one type: one code path serves every
  instance, addressed only by an index variable named for its type (`slot`, `osc`, `voice`, `layer`, `lane`, `band`, or with `Ix`,
  `Index`). Counts are named constants (`kSlots`), never a bare 4.
- Address different things by IDs that never change. Frozen parameter IDs never change (parameter-ids-never-change). An instance's ID
  is made from its index by the manifest's generator, `slotId(i, "reverb.mix")`, and must produce exactly today's frozen string; a field
  one instance lacks is appended at the end of the record, never inserted. A test checks that the generated IDs equal the frozen lock,
  for every instance.
- Give every instance's record the same fields: the same parameters, the same press-map rows, the same effects, the same moons.
- A literal instance is one of three, never bare: an example (on a `seen in:` or `example:` line), a selection rule (a selector listed
  in the manifest), or a declared constant (a named row in the manifest, read by name).
- Prove a change to a container on every instance with the generated gate `shape_symmetry` (the `prove-instances-identical` skill):
  every instance has the same members, and every pair swaps the same.
- Write tests, probes, planted faults and agent briefs with the instance as a parameter, run on every instance.

Never do:
- Scope a check, a gate or a review to folders ("the engine"): a many concept is many everywhere.
- Write an instance index or an instance ID as a literal in logic: `slot == 1`, `slotIx != 1`, `osc == 0`, `voices[3]`, `"slot2."`,
  `"osc1_"`, `{ a[0], a[1], 0, 0 }`. Literals belong only in the data tables, generated tables and the parameter record.
- Give one instance a path, a chain, a buffer, a table row or a field the others lack.
- Treat one instance as the good one in a planted fault (`plantX && slot != 1`), or name a fixed instance in a brief.
</constraints>

## Check
- `design/shape.json` is the scope; the shape-law and brief-guard hooks enforce the number rule at write time, in every folder.
- `shape_symmetry` (generated at configure time by `claude-packs symmetry gen`, run by `.claude/tools/shape-symmetry.mjs`): for each many
  concept, the members of every instance are the same set, and every one of the N·(N-1)/2 pairs swaps the same. Its selftest plants a
  missing member and a swap difference.
- The project's own tests: the generated IDs equal the frozen lock for every instance.
