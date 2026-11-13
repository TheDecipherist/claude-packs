---
# concepts: cpp, js, python, tooling, tests
paths:
  - "placeholder"
---

# A generator derives each item's seed by hashing the run seed with the item's index

This rule is about the seeds of a generator or a fuzz run (a bank of random recipes, random test cases), never about the signal path. Seeds `1201` and `1202` with `seed + i` shared eleven recipes of a bank of 100, because run 1201 item 1 is run 1202 item 0.

<constraints>
Always do:
- Derive item `i` of run `s` as a hash of the pair (`s`, `i`), through one function, so nearby run seeds share nothing.
- Count the items two nearby run seeds share, and keep that count at zero in a test.
- Write the derivation where a random bank, a fuzz run or a test generator is made.

Never do:
- Seed item `i` with `seed + i`, `seed * k + i` or any sum or product of the two.
- Treat this as licence to hash anything into the audio itself: `neutral-is-exact` still holds for the signal.
</constraints>
