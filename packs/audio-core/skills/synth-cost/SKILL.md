---
name: synth-cost
description: Use when asking whether a synth design is too heavy, how many voices a machine can run, what an oscillator, filter, unison or effect costs, or whether effects should be per oscillator or global.
---

# What a synth design costs, before it is built

One job: keep a running total of a design's CPU cost in units, against the budget, and say plainly when it will not run on most machines. The table of units, the voice counts and the thresholds are in `cost-ledger.md` beside this file: read it before the first figure.

Why: each part is cheap alone. Multiplied by the oscillators and the voices it is the whole CPU, and a build that finds out at its CPU gate has written every step for the bigger design.

<constraints>
Always do:
1. Count in **units per voice**, where 1 unit is one band-limited saw oscillator at 44.1 kHz. The total is `units per voice x voices + global units`. A part used by every oscillator counts once per oscillator: a filter per oscillator is one filter each.
2. Show the running total after every answer that changes it, in one line:
   `Cost so far: 4 oscillators x (1 osc + 1 filter + 0.3 env) + drive 0.5 = 9.7 units per voice x 32 voices = 310 + global 15 = 325 units. Fits most machines (400).`
3. Hold it against the budget: about **400 units** fits most machines, **800** a high-end one; over 800 is a synth people turn off. The budget is `cpu-worst-case-per-block`'s law (the full polyphony on the heaviest patch, worst block, at 44.1 kHz and 128 samples, then 48 kHz) said in units.
4. Over 400, say so in plain words with the cuts in order of least pain, each with what it saves: effects per oscillator to global sends, unison from 4 to 2, voices from 32 to 16, a ladder filter to a state-variable one. The person picks; with no answer, global effects first, then voices.
5. Over 800, the same, and the order records the choice as a decision with the number.
6. Keep effects **global by default**: one chain after the voice sum, a send per oscillator and a DRY switch. An insert per oscillator is offered only with the multiplied number beside it (`2 units x 4 oscillators x 32 voices = 256 units`), and the order names the oscillator and the effect when it is chosen.
7. Ask the voice count together with the per-voice cost, never alone; a physical model is played at 16 to 32 voices.
8. Put the ledger in the order (its position paragraph) as an estimate, and make W0 measure the real unit: one INIT voice, worst block, at 44.1 kHz and 128 samples, then at 48 kHz. The measurement replaces the estimate, the ledger is re-scaled, and the CPU gate holds the measured figure for the rest of the build.
9. In a build, measure a repeated part's cost once on its template and multiply (`prove-instances-identical`), never once per instance.

Never do:
- Refuse a big design. The person may want it; the number goes next to it.
- Let a part through without its number, or quote average CPU as the figure.
- Offer effects per oscillator as a blanket feature.
- Call an estimate a measurement. The order states both, and which is which.
</constraints>

## In an order

- **The position:** the ledger, estimated; the budget as a number; which machine is the reference.
- **W0, Done when:** the unit measured at 44.1 kHz and 48 kHz; the ledger re-scaled; the heaviest planned patch x the voice count within the budget, or the decision that it is not, and why.
- **Each engine step, Done when:** its measured cost added to the ledger; the total never past the budget without a decision.
- **The presets step:** the heaviest preset measured at full polyphony; the report quotes that figure.
