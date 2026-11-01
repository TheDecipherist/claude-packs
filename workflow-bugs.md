# claude-packs: workflow bugs

Faults in how synths are built with this kit, logged before they are fixed, closed with cause, fix and what now catches it.

## Open

| # | Found | What happens | Where |
|---|---|---|---|
| KWB-1 | 2026-11-01 05:47 EST | [gap] A day lost to a hard-coded "slot 2" (Stellix S38, B-178, B-200). It came from one spec sentence ("Slots stack: PIANO in slot 1 and PAD in slot 2 both play every note") and the sound recipes' "Slot 1 / Slot 2" headings, spread through 9 agent briefs and about 50 tests, and was built as code that knew slot 2: slot 2 got every planet, effect and control; slots 1, 3 and 4 were left behind. The instance checks (no-instance-index-literal, no-instance-id-literal, the swap test) were scoped to the engine folders, so the world, the seed and the space code (slots 3 and 4 without DELAY, HEAT and REVERB: B-200) got through. Cause: whether a thing is ONE or MANY was never written down, so every check had to guess its scope from a folder list, and a brief or a spec could name an instance with nothing to refuse it. Fix (0.9.0, the shape law): design/shape.json per synth (each concept one or many, its generator, its selectors, its declared constants); the number rule (a literal instance is an example, a selection rule or a declared constant, never bare) enforced at write time in every folder by shape-law, in briefs and docs by brief-guard; a generated shape_symmetry gate (every instance the same members, every pair swaps the same) replacing the engine-scoped instance check; the making and making-check hooks; once-only against copy-paste. | the kit: checks scoped by folder, no shape manifest |
