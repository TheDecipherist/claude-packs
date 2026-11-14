---
# concepts: cpp, js, python, tooling
paths:
  - "placeholder"
---

# A machine's algorithm list is real only if each one is the right kind of effect

<constraints>
Always do:
- Make each algorithm a block graph, as data, run by one loop.
- Prove the kind by measuring: a delay delays, a comb combs, a filtered delay is filtered.
- Report spread per algorithm and across the bank, as medians, over 8 seconds or more, with log-spaced frames.
- Use the machine's own numbers: its stage count, its interval, its delay memory.
- Keep a table of effect kinds a probe can assert: phaser, flanger, chorus, comb, delay.
- Tell a delay from a reverb by the level fall between repeats.
- Read an edit-matrix row as a claim about signal flow: a delay reads the input.
- Give a delay replica its lengths, its topology and its coefficients; lengths alone are a third of it.
- Tell a delay from a reverb by the gap between repeats: a delay shows 30 dB or more of near-silence between repeats, measured over at least 8 s; a reverb with echo taps showed 17 dB. Never count repeats or use whole-render crest factor to tell them apart.
- Fill the table of effect kinds: phaser = an allpass chain, stages/2 notches, nothing delayed; flanger 0.1 to 10 ms with feedback; chorus 10 to 40 ms, several voices, little feedback; a comb under about 30 ms fuses to pitch, and the same block at 500 ms is an echo.
- Name an algorithm in one place only, the coefficient builder run on a parameter change; the sample loop never branches on the algorithm number.

Never do:
- Pass a table test as proof. One unit had 15 algorithms on 1 DSP path, and another had 13 of 23 that were a wire.
- Build a family of effects on a single generic engine and call the list done.
</constraints>
