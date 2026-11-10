---
paths:
  - "data/factory.csv"
  - "data/params.csv"
  - "presets/**"
  - "banks/**"
  - "**/*[Pp]reset*"
  - "**/*[Bb]ank*"
---

# Presets carry the author's own names, INIT is neutral through every stage, and a bank shows the engine

<constraints>
Always do:
- Name every preset in the author's own words, `CATEGORY . Name`, three words at most, describing the sound, not the recipe, in a closed category.
- Keep INIT neutral through every stage: every module off, one clean saw through nothing, every stage it passes at its exact neutral value (`neutral-is-exact`). Every category has its INIT.
- Make the bank show the engine, not the effects: each preset uses what only this machine's engine does, and the effects shape it. A preset that is mostly reverb and delay on a plain tone is a wasted slot.
- Take every control into account: each one is used across the bank, or exempt with a written reason.
- Run `spread-probe` over the bank before calling it done: every program rendered with the same excitations, and the effectively distinct sounds counted and reported beside the total.
- Gate a preset by the `design-a-preset` skill's list: first note, level, mono, movement, sync, tail.

Never do:
- Name a preset after another machine, a brand, an artist or a track, or copy a factory name.
- Leave a module on in INIT, or give a stage a value close to neutral where it should be exactly neutral.
- Call a bank done before `spread-probe` has run on it, or on its first sound alone.
</constraints>
