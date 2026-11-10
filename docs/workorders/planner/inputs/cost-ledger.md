# The cost ledger: is this idea too big for most machines?

The interview adds one thing at a time: another oscillator, unison, a filter per oscillator, effects per oscillator, more voices. Each is cheap alone. Multiplied by the polyphony they are the whole CPU, and the order would only find out at the build's CPU gate, after every step was written for the bigger design. So the skill keeps a running total from the first sound question, shows it after every answer that changes it, and says plainly when the design will not run on most machines.

## How it is counted

Everything is in **units per voice**, where 1 unit is one band-limited saw oscillator at 44.1 kHz (most DAW projects run at 44.1 kHz because most sample packs are 44.1; 48 kHz is the second figure, never the only one). The total is `units per voice x voices + global units`. The numbers below are planning estimates, not measurements: W0 of every order measures the real unit (one INIT voice, worst block, at 44.1 kHz and 128 samples, and again at 48 kHz) and the ledger is re-scaled to it before W1. The order states both the estimate and the measured figure.

| per voice | units | note |
|---|---|---|
| band-limited oscillator (saw, pulse, tri, sine) | 1 | PWM adds nothing |
| unison | x voices | 4 voices of unison is 4 oscillators |
| supersaw of 7 | 5 | shared phase work |
| FM, 6 operators | 4 | per program |
| wavetable / bit-shaped | 1.5 | plus 0.5 for a morph |
| noise | 0.3 | |
| physical model (piano, tine, reed, tonewheel) | 6 to 10 | per note; the engine says which |
| filter, state-variable or 2-pole | 1 | per filter: a filter per oscillator is one each |
| filter, ladder or zero-delay-feedback | 3 | |
| oversampling on a stage | x2 or x4 on that stage only | drive and nonlinear stages; never the whole voice |
| envelope | 0.1 | three per oscillator by the house law |
| LFO | 0.1 | |
| drive / saturation (insert, per oscillator) | 0.5, x4 if oversampled | |
| chorus (insert, per oscillator) | 2 | |
| delay (insert, per oscillator) | 1 | |
| pitch glide, velocity and assign maths | 0.2 | |

| global, once | units |
|---|---|
| reverb | 8 to 20 (plate 8, hall 12, big 20) |
| delay, stereo with filtered loop | 2 |
| chorus / ensemble | 2 to 4 |
| limiter and meter | 1 |
| arpeggiator, sequencer, rows | 0.5 |

## Effects per oscillator are a cost decision, not a feature question

Most synths have one effects chain after the voice sum, with a send or a dry switch per oscillator, because an insert per oscillator is multiplied twice: by the oscillators and by the voices. Four oscillators, 32 voices, one chorus each: 4 x 32 x 2 = 256 units for the chorus alone, two thirds of the whole budget, before an oscillator has made a sound. So the default is global, and per-oscillator inserts are offered only with the multiplied number beside them:

```
Chorus per oscillator: 2 units x 4 oscillators x 32 voices = 256 units. Global chorus with per-oscillator sends: 4 units. Keep global?  [yes]
```

Where a kind really needs an insert on one oscillator (drive on a bass body, a tine's own tremolo), the order names that oscillator and that effect, and the ledger carries it. "Effects per oscillator" as a blanket feature is never the default.

## The budget

A plugin is one of many in a project. The house budget for a synth: **the full polyphony, every voice playing the heaviest patch in the bank, fits in 25 % of one core of the reference machine at 44.1 kHz and 128 samples, worst block, and is re-checked at 48 kHz** (`cpu-worst-case-per-block`). The reference machine is a four-year-old laptop, not the owner's workstation; a design that only runs on the build machine is not finished.

Until W0 measures the unit, the planning figure is: **about 400 units is the budget for most machines**, 800 for a high-end machine, and over 800 is a synth people turn off.

## Where the voices go

| voices | what it is for | the data |
|---|---|---|
| 1 to 2 | bass, lead, acid, sequence | mono and legato kinds; glide lives here |
| 6 to 8 | the classic polysynth; chords with some stealing | most hardware |
| 16 | the modern default | enough for pads with a long release |
| 32 | pads with 2 s releases under fast playing, layered patches | the plugin world's usual ceiling |
| 64 to 96 | big stacked pads, four oscillators each with its own path, long releases | the house synth is 96; it needs a per-voice cost under 4 units to fit |

A voice count is a question (2.1), but it is answered together with the per-voice cost, never alone.

## What the skill does with it

After each answer in section 2 (the sound) and 2.0 (effects per oscillator), the skill shows one line:

```
Cost so far: 4 oscillators x (1 osc + 1 filter + 0.3 env) + chorus per osc 2 + drive 0.5 = 11.7 units per voice x 32 voices = 374 + global 15 = 389 units. Fits most machines (400).
```

And at three thresholds it says so, in plain words, with what would bring it back:

- **Over 400 (most machines):** "This will be heavy on an ordinary laptop. The cheapest cuts, in order: effects per oscillator to global sends (saves N), unison from 4 to 2 (saves N), voices from 32 to 16 (saves N), the ladder filter to a state-variable (saves N)." The person picks, or the default applies: global effects first, then voices.
- **Over 800 (high-end only):** the same, and the order records the decision as d-n with the number, because the person has chosen a synth most people cannot run.
- **A physical model at high polyphony:** a piano at 96 voices is 600 to 1,000 units on its own; the skill says a model is played at 16 to 32 voices, and asks whether the model is the whole synth (then 32 voices) or one engine among others (then that engine's slot caps its own polyphony).

Two things it never does: refuse a big design (the owner may want it), or let one through without the number next to it. The order carries the ledger as a table in the position paragraph, the W0 measurement replaces the estimate, and the CPU gate holds the measured figure for the rest of the build.

## What it adds to the order

- **Position:** the ledger, estimated; the budget as a number; which machine is the reference.
- **W0, Done when:** one INIT voice measured at 44.1 kHz / 128 and at 48 kHz / 128, worst block; the unit written into the ledger; the ledger re-scaled; the per-voice cost of the heaviest planned patch x the voice count within the budget, or the decision that it is not and why.
- **The engine steps, Done when:** each step adds its measured cost to the ledger; the running total never passes the budget without a decision.
- **The presets step:** the heaviest preset in the bank measured at full polyphony; that is the figure the report quotes.

The house rule behind it: a slot's cost is measured once on the template and multiplied, never measured per instance (`prove-instances-identical`).
