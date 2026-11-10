# The questions: what are you making, and what makes it done

Two pillars. Every answer in pillar 1 must produce a line in pillar 2, or it is taste with no finish and cannot go in the order. Each question shows its default; "default" or silence takes it. A section is asked at a time, in the user's words, never in the kit's.

The kind (Q0) decides which sections are asked. ● asked for every kind, S synth, E effect, R replica, P part added.

## Pillar 1: what are you making?

### Before 0: a concept picture, if the idea is already in your head (optional)

If you can already see it, make a concept render in OpenArt first (Nano Banana Pro, 16:9) and bring it to the interview. It becomes a source: the section list (5.2), the feel and the sound parts (2.x) are read off it and only confirmed, not asked from nothing. Expect to render it again at the end (5.1): the questions always change something, and the final picture is the one that goes in `design/reference/`, not the concept.

### 0. The kind ●

| # | Question | Default | Makes done |
|---|---|---|---|
| 0.1 | What are you making: a new synth, a new effect, a replica of a real machine, or a part added to an existing one? | (must answer) | picks the step set |
| 0.2 | What is it called, for now? | the folder name | the name is in every file; renaming later is one commit |
| 0.3 | Is it an original, or a reproduction of something that exists? | original (replica: reproduction) | the order says which, because the laws differ (`reproduction-or-original`) |

### 1. The stack ● (stated, not asked; the user may override one line)

C++ with JUCE, CMake. The `synth-creator` configuration of claude-packs with `cpp`, `audio-core`, `instrument-shell`, `midi`, `sound-design` (replica: `reverse-engineering` too; a drawn 3D or GPU page: `gpu-painter`). `synthcore` for tempo, MIDI clock, transport, QWERTY and focus. synthkit's `new_synth.py` for the skeleton. Standalone from the eproms rack for every test. macOS first, Windows last.

| # | Question | Default | Makes done |
|---|---|---|---|
| 1.1 | Which formats at the end: standalone only, or VST3 / AU too? | standalone until the order says VST3 | each named format builds from a fresh clone on each named platform (`cpp-builds-everywhere`) |
| 1.2 | Windows too, or macOS only? | macOS, Windows at the end | the Windows build is a step at the end, or absent |

### 2. The sound S E R

Stated, not asked (the house law; the order carries it in its Always list): **every oscillator is its own voice path.** Each oscillator (slot) has its own audio path with its own filter, its own envelopes (filter, amp and pitch by default), its own level and pan, and its own tuning (octave, semitone, fine). One filter over the whole stack is never the design: a pad's air is high-passed while its body is low-passed, a pluck's click decays in 100 ms over a body that sustains, a bass's sub is unfiltered under a body that barks. The patch research found this missing in every weak bank ("no oscillator is tuned against another, the oscillators don't have audibly different envelopes"). *Makes done:* each oscillator rendered alone (every other muted) shows its own filter and its own three envelopes measured (a cutoff sweep, an amp decay, a pitch drop) independent of the others; a planted shared filter turns the gate red.

| # | Question | Default | Makes done |
|---|---|---|---|
| 2.0 | Effects global only, or also per oscillator? (Asked with the cost next to it, from `cost-ledger.md`: per-oscillator effects multiply by oscillators and by voices, which is why most synths do not have them.) | global: one effects chain, with a per-oscillator send level and a DRY switch so a kick or a sub can skip it. Per-oscillator inserts only when the person says yes after seeing the number, and then the cheap ones first (drive 0.5 units) before the dear ones (chorus 2, delay 1) | global: a DRY oscillator measures identical with and without the chain, and each oscillator's send level measures on the wet signal; per oscillator, if chosen: an insert measures only on that oscillator's render, and the ledger carries its cost x oscillators x voices within the budget |
| 2.1 | How many notes at once? | 16 voices (synth), n/a (effect) | the stated count sums without clipping (`voice-sum-headroom`); the stated count renders within the CPU budget per block |
| 2.2 | Mono, poly, legato, unison: which modes? | poly, mono, legato | each mode has a gate that fails when a note is dropped or doubled (`note-ledger-and-pedals`) |
| 2.3 | What makes the sound: analog-style oscillators, FM, wavetable, samples, noise, a sub? How many per voice? | 2 oscillators + sub + noise, analog-style, from the house catalogue | every oscillator type measures within `measure-tone`'s budget at three pitches; all types output the same level within 0.5 dB |
| 2.4 | A filter? | the house filter (Solera's copy): LP, BP, HP, notch morphing | the copy measures IDENTICAL to its source (`copy-and-prove`); a sweep through the types shows no level drop beyond the house figure |
| 2.5 | Beyond each oscillator's own filter, amp and pitch envelopes: any extra envelopes or LFOs, and how many? | 2 free envelopes and 2 LFOs, assignable to any control; every LFO with a delay, free or synced | measured attack, decay and release match the displayed values within tolerance; an LFO at a stated rate measures that rate in the audio; a vibrato LFO with a 300 ms delay measures silent for 300 ms |
| 2.6 | Which effects: delay, reverb, chorus, heat/drive, bit, pitch, mod? House or new? | delay + reverb from Solera, heat | each effect's neutral setting computes exactly nothing (`neutral-is-exact`); reverb decay within tolerance at three settings (`measure-reverb`); send and direct routes measure different |
| 2.7 | Anything tempo-synced: delay, LFO, arp? | delay and LFO sync | the unit follows tempo in its audio at three BPMs (`clock-probe`); OFF is a sound (`sync-is-a-mode`) |
| 2.8 | An arpeggiator or sequencer? | none | if yes: a stated pattern at a stated BPM lands on its samples (`sample-accurate-midi`) |
| 2.9 | Which oversampling or anti-aliasing: none, 2x, 4x? | the house default for the chosen stages | nonlinear stages show alias products below the stated floor (`measure-tone`) |

### 3. Playing it S R

| # | Question | Default | Makes done |
|---|---|---|---|
| 3.1 | Velocity, aftertouch, mod wheel, pitch bend: which do something, and to what? | velocity → level and filter; mod wheel → vibrato; pitch bend ±2 | each named source moves its named target, measured in the audio |
| 3.2 | Pitch bend range? | ±2 semitones, settable | a full bend measures the stated interval |
| 3.3 | QWERTY playing from the computer keyboard? | yes, from synthcore | keys play while the window has focus, no system beep (synthcore's gate) |
| 3.4 | MIDI learn or fixed CC map? | fixed map, learn later | every mapped CC moves its control at every surface (`prove-control`) |

### 4. Sounds that come with it S E R

| # | Question | Default | Makes done |
|---|---|---|---|
| 4.1 | How many presets, in which categories? | 40: 8 pads, 8 basses, 8 leads, 8 plucks, 8 keys (effect: 16 programs) | the stated count exists per category; every name is the author's own; `spread-probe` says the bank really differs |
| 4.2 | What is INIT: the neutral starting sound? | the house INIT: one oscillator, filter open, no effects | INIT measures neutral through every stage (`neutral-is-exact`) |
| 4.3 | What does a patch store? | everything except MAIN volume, octave, mod wheel and pitch wheel (house law) | save, reload, byte-exact round trip; the four excluded controls unchanged by a load |
| 4.4 | Patch format and folder? | the house `.json` bank in the user's documents folder | a bank written by version n loads in version n+1 (`state-load-versioned-and-safe`) |

### 5. The look ● (except P when the part has no panel)

| # | Question | Default | Makes done |
|---|---|---|---|
| 5.1 | The look is made as a picture in OpenArt (Nano Banana Pro, 16:9), from the sections in 5.2 and the feel you describe, every word to be drawn exactly in double quotes, and iterated until you like it. Do you have a picture already, or references you like? | none: the first render is made from the house look and the section list | the approved render goes in `design/reference/`, one per screen; `analyse-reference-look` turns it into numbers before a page is built; the rendered panel scores against it in the look gate. There is no prototype in HTML or anywhere else: the iteration is in OpenArt, the build is in code |
| 5.2 | Which sections are on the panel? | one per sound part in 2.x plus master, patches, keyboard band | every section in the chart is on the panel exactly once; every drawn control answers at its own centre (`hit-the-painted-control`) |
| 5.3 | One page, or pages/layers? | one page in 16:9 | every page's controls are hit-tested; nothing hidden (house: everything the user can touch is visible) |
| 5.4 | Any display, meter or scope? | an output meter and a patch name display | the meter reads the measured level within 1 dB |
| 5.5 | Scaling: fixed size or resizable? | 16:9, resizable by whole steps | the widest and narrowest size both render (`render-the-extremes`) |

House behaviours stated, not asked: double-click returns a control to its default; lights show on/off; a control's displayed value and its sound come from one formula; an id never changes.

### 6. The machine R only

| # | Question | Default | Makes done |
|---|---|---|---|
| 6.1 | Which machine, which revision or OS version? | (must answer) | named in the position paragraph, nowhere that ships |
| 6.2 | What do you have: service manual, schematics, firmware, factory banks, recordings, videos, the real unit? Paths. | (must list; an empty list stops the order at "gather first") | `source-checklist` passes; every law has a source (`every-law-has-a-source`); firmware stays out of git |
| 6.3 | How close: the panel identical, the sound measured against recordings, or just inspired by? | panel identical, sound measured | the panel's golden against the reference; the sound's difference to the recording measured and reported, never claimed identical (`compare-to-the-machine`) |
| 6.4 | What must not ship: names, logos, factory patch names, firmware bytes? | all of them | a release gate greps the binary and the bank for each |
| 6.5 | Does it sync, and over what? | find out first (`does-it-sync`) | the answer is a step's result, with its source |

### 7. The part P only

| # | Question | Default | Makes done |
|---|---|---|---|
| 7.1 | Which unit, and which part: an oscillator, an effect, a page, a control, a mode? | (must answer) | the part's row in `design/shape.json` first; its step on its own branch via `build-step` |
| 7.2 | What must not change? | every existing id, patch and golden | existing patches load byte-exact; existing goldens still score; `param-id-lock` passes |
| 7.3 | Does the chart change? | yes if a route changes | the chart commit comes before the code commit |

### 8. Not in this order ●

| # | Question | Default | Makes done |
|---|---|---|---|
| 8.1 | What is out, for now? | VST3, Windows, MPE, randomize, patch compare, undo | listed under "Left out on purpose", so the run never starts them |
| 8.2 | Anything it must never do? | none beyond the house laws | each goes in the Never list with a check or a gate that catches it |

## Pillar 2: what makes it done

The order's last step collects every "makes done" line above into one list, and the run finishes only when each is measured or listed as `BLOCKED BY KIT`. Three things make the whole unit done, on top of the per-answer lines:

1. **It builds and opens**: a fresh clone builds on each named platform; the standalone opens from the eproms rack; `doctor --strict` is green; every gate from `gates-from-commit-one` was seen red once and is green now.
2. **It is proved, not described**: every control answers at every surface; every sound stage has its numbers; the bank spreads; the clock follows; the realtime audit has zero findings; the frame time is within budget.
3. **It is written down**: every decision in `decisions.md`, every bug in `bugs.md` before its fix, a report with counts, a `summary.md` the user can read without knowing any of the above.

A "done when" that has no number and no test cannot go in the order. "Sounds good", "looks right" and "works" are answered by a question in pillar 1, never by a step.
