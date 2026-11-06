---
# concepts: cpp, tests, notes, plan, python, go, rust, js
paths:
  - "placeholder"
---

# Identical containers by index, different things by ID; never a literal of either in logic

Learned on Stellix (2026-10-31, B-175, B-177, B-178, B-200): its four slots are identical containers, yet one slot had its own
effects chain, its own effect moons, the only multi-core rendering, the only push laws, the only ARP controls in the press map and its own
set of effect parameters, because the first build played that slot and every later step, test and agent brief named it. The checks were
scoped to the engine folders, so the world and space code left two slots without their effects (B-200). The owner: "slots are index based.
it shouldnt matter if you swap one."

<constraints>
Always do:
- Read the scope from `design/shape.json`, never from a folder list. A concept the manifest calls `many` is judged in every source,
  test, doc, brief and recipe, wherever it is named; a container type with no row there gets its row first (one or many, its
  generator, its selectors, its declared constants, what each instance `owns`, its `symmetry` commands).
- Treat identical containers (slots, oscillators, layers, lanes, bands, workers) as instances of one type: one code path serves every
  instance, addressed only by an index variable named for its type (`slot`, `osc`, `layer`, `lane`, `band`, `worker`, or with `Ix`,
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
- Write tests, probes, planted faults and agent briefs with the instance as a parameter. Behaviour is tested once on the template (`test-the-template-once`); `shape_symmetry` is the cheap proof the rest are that template, so a behaviour test never loops over every instance of hundreds.

Never do:
- Scope a check, a gate or a review to folders ("the engine"): a many concept is many everywhere.
- Write an instance index or an instance ID as a literal in logic: `slot == 1`, `slotIx != 1`, `osc == 0`, `layers[3]`, `"slot2."`,
  `"osc1_"`, `{ a[0], a[1], 0, 0 }`. Literals belong only in the data tables, generated tables and the parameter record.
- Give one instance a path, a chain, a buffer, a table row or a field the others lack.
- Treat one instance as the good one in a planted fault (`plantX && slot != 1`), or name a fixed instance in a brief.
</constraints>

## Check
- `design/shape.json` says which concepts are MANY (their count, generator, selectors and declared constants); every check reads it.
- The `shape-law` hook (0.9.0, KWB-1) refuses, at write time, in every folder (only the manifest's `exclude` left out), an instance
  index compared with or an instance array indexed by a number, an instance ID written out (`"slot2."`), a hand-listed set, a role
  name for an instance, a test that drives one instance, an unlisted selector and an instance type with no manifest row. It replaces
  the engine-scoped `no-instance-index-literal` and `no-instance-id-literal` checks, which let the world and the space code through.
  `buffer[1]`, `channel == 1` and `pos[0]` are not instances and never fire.
- The `brief-guard` hook refuses a brief, spec or recipe that names an instance outside a `seen in:` or `example:` line.
- `npx --no-install @thedecipherist/claude-packs shape scan` lists every instance literal already in the repo.
- `shape_symmetry` (generated at configure time by `npx --no-install @thedecipherist/claude-packs symmetry gen`, run by `.claude/tools/shape-symmetry.mjs`): for each many
  concept, the members of every instance are the same set, and every one of the N·(N-1)/2 pairs swaps the same. Its selftest plants a
  missing member and a swap difference.
- The generated IDs equal the frozen lock for every instance, in the project's own tests.
