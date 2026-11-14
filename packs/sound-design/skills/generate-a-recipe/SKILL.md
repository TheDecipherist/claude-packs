---
name: generate-a-recipe
description: Use when a new patch recipe for a kind of sound is to be generated from statistics of real patches, or when a generated bank sounds alike, repeats itself or drifts from what real patches do.
---

# Generate a recipe (one job: a new synth-neutral recipe that real patches of its kind could have been)

A recipe invented by hand is a guess at a kind of sound, and a recipe drawn per field from the statistics is a blend no patch ever was. Anchoring on a real patch and varying inside its kind's range gives a recipe that is new and still of its kind. The kit keeps its own baked tables (`design-a-preset` references); a project's patch database is the project's, and this skill takes whatever statistics the project has.

<constraints>
Always do:
1. Fix the kind, and whether the statistics are hardware or software. Never mix the two units in one set of statistics, and drop patches left at default values before taking any. Count an effect or route only when it is audible (a stored setting is not an active one), and read which synths store a setting before calling it common.
2. Pick an anchor: one real patch of the kind. Pick its nearest neighbours by one feature-vector function; use the same function, with the same scales, for recipes and for real patches.
3. Blend two donors (the anchor and a neighbour). Take a choice set whole from one donor (a filter type with its slope, an oscillator wave with its mode), never field by field.
4. Vary each continuous value inside the p10 to p90 of the kind's real patches, and nowhere wider.
5. Run the must-route list for the kind (what has to be connected for the kind to work). Redraw until the checks pass, with a cap on redraws; report a recipe that never passes.
6. For a bank of recipes, keep a ledger: refuse a recipe nearer to an earlier one than the p10 of real distances; pick the next by the farthest point from those kept; report the spread at the end. When a category with few real patches cannot hold more recipes at the p10 distance, stop, name the category, keep what was made, and offer fewer recipes or p5.
7. Derive each recipe's seed by hashing the run seed with its index (`seeds-are-hashed`).
8. Turn a recipe into a machine's patch through that machine's adapter, and prove the result by rendering it (`bounce-a-plugin`).

Never do:
- Draw each field independently from its own distribution.
- Widen a range to get more variety: ask for another anchor.
- Keep a recipe for being new alone. A new recipe off the kind's range is a fault.
</constraints>
