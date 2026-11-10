---
paths:
  - "data/factory.csv"
  - "data/params.csv"
  - "presets/**"
  - "banks/**"
  - "**/*[Pp]reset*"
  - "**/*[Bb]ank*"
---

# Presets carry the author's own names, INIT is neutral through every stage, a bank shows the engine, and its levels are measured

<constraints>
Always do:
- Name every preset in the author's own words, `CATEGORY . Name`, three words at most, describing the sound, not the recipe, in a closed category.
- Keep INIT neutral through every stage: every module off, one clean saw through nothing, every stage it passes at its exact neutral value (`neutral-is-exact`). Every category has its INIT.
- Make the bank show the engine, not the effects: each preset uses what only this machine's engine does, and the effects shape it. A preset that is mostly reverb and delay on a plain tone is a wasted slot.
- Take every control into account: each one is used across the bank, or exempt with a written reason.
- Run `spread-probe` over the bank before calling it done: every program rendered with the same excitations, and the effectively distinct sounds counted and reported beside the total.
- Gate a preset by the `design-a-preset` skill's list: first note, level, mono, movement, sync, tail.
- Measure levels, never type them: -6 dBFS peak on a four-note chord at velocity 100, the bank within 1 LU, mono under 120 Hz, nothing under 40 Hz, with the limiter off (`prove-a-bank`).
- Give every pad a release at least as long as its attack.
- Make velocity audible on every preset, and on a pad never only as volume.
- Make the mod wheel do something on every preset.
- Put a delay on a subdivision other than the arp's.
- Leave glide off by default; a preset that glides says why in its notes.

Never do:
- Name a preset after another machine, a brand, an artist or a track, or copy a factory name.
- Leave a module on in INIT, or give a stage a value close to neutral where it should be exactly neutral.
- Call a bank done before `spread-probe` has run on it, or on its first sound alone.
</constraints>
