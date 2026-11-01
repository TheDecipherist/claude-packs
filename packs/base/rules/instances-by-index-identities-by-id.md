---
# concepts: cpp
paths:
  - "placeholder"
---

# Identical containers by index, different things by ID; never a literal of either in logic

Learned on Stellix (2026-10-31, B-175, B-177, B-178): its four sound slots are identical containers, yet slot 2 had its own effects
chain, its own effect moons, the only multi-core voices, the only push laws, the only ARP controls in the press map and its own set of
effect parameters, because the first build played slot 2 and every later step, test and agent brief named "slot 2". Nothing checked
the other three. Tim: "slots are index based. it shouldnt matter if you swap one."

<constraints>
Always do:
- Treat identical containers (slots, oscillators, voices, layers, lanes, bands) as instances of one type: one code path serves every
  instance, addressed only by an index variable named for its type (`slot`, `osc`, `voice`, `layer`, `lane`, `band`, or with `Ix`,
  `Index`), so the checks below can see it. Counts are named constants (`kSlots`), never a bare 4.
- Address different things by IDs that never change. Frozen parameter IDs never change (parameter-ids-never-change). An instance's ID
  is generated from its index by one function, `slotId(i, "reverb.mix")`, and must produce exactly today's frozen string; a field one
  instance lacks is appended at the end of the record, never inserted. A test checks that the generated IDs equal the frozen lock, for
  every instance.
- Give every instance's record the same fields: the same parameters, the same press-map rows, the same effects, the same moons.
- Prove a change to a container on every instance with the swap test (the `prove-instances-identical` skill): swapping two instances
  changes nothing but the index; sound, picture, state and bindings identical, for every pair.
- Write tests, probes, planted faults and agent briefs with the instance as a parameter, run on more than one instance.

Never do:
- Write an instance index or an instance ID as a literal in logic: `slot == 1`, `slotIx != 1`, `osc == 0`, `voices[3]`, `"slot2."`,
  `"osc1_"`, `{ a[0], a[1], 0, 0 }`. Literals belong only in the data tables, generated tables and the parameter record.
- Give one instance a path, a chain, a buffer, a table row or a field the others lack ("slot 2's own effects").
- Treat one instance as the good one in a planted fault (`plantX && slot != 1`), or name a fixed instance in a brief ("drive slot 2").
</constraints>

## Check
- `.claude/checks/no-instance-index-literal.json`: an instance index compared with, or an instance array indexed by, a number.
- `.claude/checks/no-instance-id-literal.json`: an instance ID written out in a code string.
- Both run only on the code folders, never on data, generated tables or the parameter record. `buffer[1]`, `channel == 1` and `pos[0]`
  are not instances and never fire.
- The project's own tests: the generated IDs equal the frozen lock for every instance; every instance's record has the same fields;
  the swap test for each container type.
