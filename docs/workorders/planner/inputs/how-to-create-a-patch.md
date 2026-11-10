# How to create a patch

Edition 2026-11-09-a. The Decipherist's reference for making a patch of any kind on Stellix, Tabula and the other synthkit machines. Every category, what it is made of, the numbers that real patches use, and why those numbers make that sound. Read the category you are making; read sections 1 to 3 once.

Where a number comes from is marked:

- **[DATA]** measured in the research: 6,223 hardware factory patches of 16 machines (Virus, Andromeda, Supernova, Nord Lead, JP-8000, JX-8P, DX7, AN1X, Juno-106, M1, D-50, JD-800, Jupiter-8, Polysix, ESQ-1, MonoPoly) and 7,146 plugin presets of 8 synths (Sylenth1, Zebra2, Spire, Serum 2, Vital, Diva, Serum 1, Phase Plant), plus 1,119 branded presets and 374 branded MIDI files. A median is followed by its middle half in brackets (25th to 75th percentile). HW = hardware, SW = software.
- **[LAW]** the house law (`preset-design-law`, `stellix-sound-recipes.md`): a decision we made, kept until a measurement overturns it.
- **[WHY]** the physics or the psychoacoustics: the reason the number works.
- **[EAR]** what the author heard in the seven recipe rounds (253 converted presets heard, 92 liked).

Sources are listed at the end.

---

## 0. The vocabulary used here

- **Slot / oscillator.** One sound engine with its own tune, fine, level, pan, filter, amp envelope and filter envelope. Tabula has four (OSC 1 to 4); Stellix calls them slots. A big sound is slots stacked on the same key range. A slot has a **role** (Body, Air, Ground, Edge, Click, Sub); the role, not the slot number, is what a recipe names.
- **Engines (TYPE):** ANALOG (saw, double saw, pulse, square, tri, sine, dual sine, feedback, saw-tri; up to 8 unison voices), SUB (square, pulse, sine, tri; -2 to 0 octaves), FIRESAW (seven-saw supersaw in up to four stacks with DETUNE, MIX, DRIFT, SPREAD; Stellix adds SAWS, SPLIT, GROUP DRIFT), FM (35 six-operator programs, BRIGHT, FEEDBACK), NOISE (white, pink, red; BAND, WIDTH, S&H), PIANO (grand, upright, honky-tonk physical model), FIREBLOOM (bit-shaped waves with BITS, EDGE, BODY, FADE, MOTION, STRIKE), FIREBASS (phase-locked body and sub in one mono line, 20 body waves, PUNCH, TIGHT, GLIDE, BEND), FIREKEYS (reed electric piano), FIRETINE (tine electric piano, stage or suitcase), FIREWHEEL (tonewheel organ, nine drawbars, percussion, scanner vibrato).
- **SWELL** = the amp envelope. **GLOW** = the filter envelope. Written A / D / S / R, times in ms or s, sustain 0 to 1, then the amount (how far GLOW moves the cutoff, -1 to +1) and VEL (how much velocity scales that amount).
- **Cutoff and resonance** are written 0 to 1 of the knob (0.5 is about 1 kHz on a log knob from 20 Hz to 20 kHz; 0.28 about 300 Hz; 0.65 about 2.5 kHz). Where the data is in octaves (hardware filter envelopes) it says so.
- **KT** = filter key tracking, 0 to 100 %. **MORPH** = the filter's X/Y point.
- **Filter types:** SUPER (the clean ladder), SVF (state variable), CASCADE (the 12 dB two-pole, warm), TWIN (two halves, band and notch), BURN (Stellix's own, with HEAT, SCREAM, DAMAGE). Slopes 6 to 24 dB/oct.
- **HEAT** = the drive, PRE (before the filter) or POST (after). **MOD** = the modulation effect (chorus, ensemble, phaser, flanger). **Delay** with PRE and MAIN taps, synced or free. **Reverb** by program (room, plate, hall, big, cathedral).
- **Row / matrix row** (Tabula) = a tempo-clocked step modulator on one control. **RIDE** = the row moves around the knob instead of owning it. **[assign]** = wheel, velocity, aftertouch or pressure on any control.
- **Space** (Stellix) = planets, orbits, moons: the sound map. Every recipe here is written with space OFF. Movement comes from the engines and the effects first. If it does not sound right without space it is not right.

---

## 1. The method: how a patch gets made

Build in this order. Each step is heard before the next one starts. Skipping to the effects to hide a weak oscillator is the most common way a patch stays weak.

1. **Start from INIT.** One ANALOG SAW in one slot, every module off, filter open, no effects. The reference every patch is heard against. [LAW]
2. **Choose the engine and the wave for the identity.** The ear names one element in a good patch. Decide what it is before touching anything else (the supersaw, the FM strike, the filter swell, the tine). Section 2.1 says which wave gives which harmonics and why.
3. **Tune the slots against each other.** Octaves, fifths, a few cents of detune. Nothing stacked on the same pitch with the same wave: that is louder, not bigger. [EAR: the author on the first banks: "no oscillator is tuned against another... most patches sound the same"]
4. **Set the filter.** Type, slope, cutoff, resonance, key tracking. The filter is the most modulated thing in every category of every synth measured (cutoff is modulated in 89 % of HW patches and 80 to 99 % of SW patches per kind) [DATA]. A patch whose filter does nothing over the note is missing its main voice.
5. **Shape the envelopes.** SWELL first, then GLOW, each slot its own where the roles differ. Section 2.4 has the shapes and the measured times.
6. **Add the movement.** One LFO or row that is heard by 2 s, another by 8 s. PWM, drift, a slow filter, a vibrato on the wheel. Section 2.5.
7. **Wire the playing.** Velocity always does something audible; the mod wheel always does something; key tracking on the cutoff. Section 2.6. A dead wheel fails review like a dead knob. [LAW]
8. **Effects last, and chosen.** Reverb named (room, plate, hall, big), pre-delay decided, delay on a subdivision, loop filtered, chorus after the filter. Section 2.7.
9. **Level by measurement, never typed.** -6 dBFS peak on a four-note chord at velocity 100; the bank matched to 1 LU; lows mono under 120 Hz; nothing under 40 Hz; limiter off. [LAW]
10. **Run the gate** (section 5). A patch is finished when it passes, not when it sounds good tonight.

**What the author's ears said over seven rounds** (253 presets heard, 92 liked) [EAR], as a bias to carry into every step:

| the liked ones had more often | by | the liked ones had less often | by |
|---|---|---|---|
| reverb on | +16 points | a unison stack (voices above 1) | -16 |
| a performance assign (wheel, velocity, AT) | +16 | mono voice | -10 |
| delay on | +14 | a sine | -7 |
| a slow attack (over 50 ms) | +10 | a SUB oscillator | -7 |
| a saw | +10 | HEAT on | -6 |
| a NOISE oscillator | +7 | glide | -4 |
| a long release (over 0.5 s) | +5 | | |

Per category, the liked share: sub 67 %, arp 64 %, acid 64 %, pad 55 %, atmosphere 53 %, lead 41 %, pluck 40 %, sequence 35 %, chord 33 %, bass 22 %, screech 7 %. Bass is the hardest kind to get right by far (87 heard, 19 liked), and the converter's unison, mono and glide defaults were part of why. Read: width from detuned slots and effects beat width from a unison stack; space (reverb, delay) and something to play (an assign) are what make a patch feel finished; glide and mono only where the kind asks for them (acid, legato lead, bass).

---

## 2. The building blocks and why they work

### 2.1 Waves: what each one is made of

A wave is a recipe of harmonics. The harmonics decide what a filter has to work with, so the wave is chosen for the filter and the envelope that follow it, not for itself.

| wave | harmonics | what it is for | why |
|---|---|---|---|
| SAW | every harmonic, falling 6 dB per octave | strings, brass, leads, pads, supersaw, most basses | the fullest spectrum, so a low-pass filter has the most to sweep through; it is in 93 % of the presets the author liked [EAR] and is what bowed strings and brass actually produce [WHY] |
| SQUARE (pulse at 0.5) | odd harmonics only | hollow sounds: clarinets, 8-bit, reese cores, sub-like bass | no even harmonics, so it reads as hollow and a touch darker than a saw at the same cutoff [WHY] |
| PULSE (width 0.1 to 0.45) | odd and even, with notches that move with the width | strings (PWM), reedy leads, string machines, Juno pads | moving the width moves the notches: with one oscillator you get the beating of two, which is why PWM is in 26 to 81 % of patches per category on the Virus and JP-8000 [DATA] |
| TRIANGLE | odd harmonics, falling fast (12 dB/oct) | soft subs, flutes, bells' fundamentals, soft keys | nearly a sine with a little edge, so it sits under a brighter slot without muddying it [WHY] |
| SINE | the fundamental only | subs, FM operators, bell partials, whistles | nothing for a filter to do, so it is a Ground, never a Body; its share among liked patches was 7 points lower than among disliked [EAR] |
| DUAL SINE / SAW-TRI / DBL SAW / FEEDBACK | variants with a SHAPE control | organ-like doubles, detuned pairs in one slot, growl | one slot where two would otherwise be spent |
| FIRESAW | seven saws spread and mixed, in up to four stacks | trance leads, big pads, stabs, chords | width without a second slot; the JP-8000 supersaw law: high-pass it near the fundamental so the low end stays mono [LAW] |
| FM program | sidebands around a carrier at the operator ratios | bells, e-pianos, metal, glass, growling bass, drums | inharmonic partials (ratio 1:1.4, 1:3.5) that no filter can make from a saw: this is the only way to a real bell [WHY] |
| NOISE | everything, coloured | breath, the strike of a pluck, snares, wind, risers | a saw has no breath; noise under a 100 ms envelope is what reads as "played" on brass, flutes and plucks; its share among liked patches was +7 [EAR] |
| FIREBLOOM | bit-shaped series waves with octave copies that bloom | pads, keys, bells, lo-fi leads | its MOTION and FADE move by themselves, which satisfies the 2 s / 8 s rule from the engine alone |
| FIREBASS | body and sub locked in phase | every bass | the body and the sub never cancel; PUNCH and TIGHT make the knock and the roll that a saw plus sub needs three modules for |
| PIANO / FIREKEYS / FIRETINE / FIREWHEEL | physical models | piano, e-piano (reed), e-piano (tine), organ | the engine is the sound; the patch sets the instrument's condition (hammer, age, pickup, drawbars), velocity does the rest |

### 2.2 Tuning the slots against each other

- **Octaves** (+12, -12, +24) add weight or air without changing the pitch the ear reads. Pads: Air at +12, Ground at -12. Leads: Edge at +12. Basses: sub at -12 (or FIREBASS SUB OCT -1).
- **Fifths** (+7) make a sound bigger and "pre-harmonised": power leads, hoover, stabs, chords. A fifth under the note (-5) is the organ's 5 1/3' and reads as a thicker fundamental.
- **Fine detune in cents** between two slots makes them beat. 3 to 7 cents is warmth (a Juno pair); 10 to 20 cents is a chorus you can hear; 25 to 50 cents is a supersaw's inside. [WHY] the beat rate is the frequency difference, so the same cents beat faster up the keyboard; that is why a detuned pair sounds lush in the middle and seasick at the top, and why FIRESAW's DRIFT (a slow wander, up to 20 cents) reads as analogue rather than as detune.
- **Unison inside one slot** (ANALOG VOICES 2 to 8, DETUNE 0.1 to 0.35): the fast way to width. Use it in one slot only, never in the Ground, never under 150 Hz. [EAR] unison was 16 points less common among liked patches than disliked: it is the thing to try after the tuning, not instead of it.
- **Different envelopes per slot.** The second slot having the same envelope as the first is what the author heard as "the oscillators in a patch don't have audibly different envelopes" [EAR]. An Air with a slower attack than the Body, a Click with a 100 ms decay over a sustained Body, a Ground that is already there when the Body swells: each slot has a job in time.
- **Different filters per slot.** Each slot's own filter on where the roles differ: the Air high-passed at 1 kHz, the Body low-passed at 0.45, the Ground unfiltered. One main filter over everything makes one thing, however many slots feed it.

### 2.3 Filters: what the type and the slope do

| choice | use it for | why |
|---|---|---|
| LP 24 dB (SUPER, SVF) | bass, pads, plucks, anything that must sit under something | the steep slope takes the top off hard, so a sweep reads as opening and closing rather than brightening; it is the Moog, SH-101, Juno sound [WHY] |
| LP 12 dB (CASCADE) | leads, strings, brass, keys | the gentler slope leaves harmonics through above the cutoff, so a lead keeps its edge at a low cutoff; Oberheim and JP-8000 territory [WHY] |
| HP 12 to 24 | the Air slot, supersaws, reese tops, stabs | removes what the Ground already gives, so the stack adds up instead of piling up; a supersaw high-passed near its fundamental is the JP-8000 law [LAW] |
| BP | FX, textures, vocal and formant sounds, wah | one band moving reads as a vowel or a body; nothing else does |
| NOTCH / TWIN | phasers in one filter, hollow pads | moving a notch over a saw is a phaser without the effect |
| BURN (Stellix) | screaming leads, acid, driven bass | the resonance goes into the drive; DAMAGE on velocity is the identity nothing else has |

- **Resonance.** Under 0.15 is warmth; 0.2 to 0.35 is a visible peak (plucks, leads, keys); 0.4 to 0.6 is the squelch (acid, hoover, zaps); 0.6+ rings and sings (303 at the top of the wheel, self-oscillation as the one deliberate flaw). The hardware medians per kind are low: pads use a resonance LFO in 9 % and a resonance wheel move in 15 % [DATA]; the house law keeps pads under 0.2 and basses 0.15 to 0.3 [LAW].
- **Key tracking.** On, 50 to 100 %, on everything played across the keyboard. Key track is the most used modulation source in hardware: 70 % of all 6,223 patches [DATA]. [WHY] a fixed cutoff makes the low notes dull and the high notes thin; 100 % keeps every note the same brightness, 50 % lets the top get a little brighter, the way a real instrument does. Plucks and leads 100 %, pads and strings 50 to 70 %, bass 50 % (a tracked bass filter opens too much on the high notes of a line).
- **Drive placement is a decision.** HEAT PRE (before the filter) is warmth: the filter rounds what the drive added. HEAT POST is grit: the drive bites what the filter left. The same amount in the two places is two different sounds; write down which. [LAW]

### 2.4 Envelopes: the six shapes and the measured times

The research named six amp envelope shapes and measured how often each kind uses them [DATA]:

| shape | what it is | hardware kinds that live on it | software kinds that live on it |
|---|---|---|---|
| gate (organ-like) | instant on, full while held, off within 100 ms | organ 57 %, vocal 53 %, lead 36 % | sequence 62 %, drums 59 %, fx 47 %, bass 42 %, lead 39 % |
| swell (pad-like) | a rise of 200 ms or more | strings 29 %, pad 28 % | pad 53 % |
| pluck / percussive | falls to near silence within 1.5 s while held | drums 65 %, arp 48 %, bell 47 %, piano 47 %, pluck 46 % | pluck 37 %, stab 36 %, arp 32 %, acid 32 % |
| decaying (piano-like) | falls to silence over 1.5 s or more | piano 29 %, keys 15 %, acid 12 % | keys 20 %, piano 20 % |
| long tail | rings 1.5 s or more after the key is let go | pad 8 %, strings 7 %, bell 7 %, fx 8 % | keys 5 %, pad 4 % |
| sustained | holds a level, short to medium release | wind 86 %, brass 73 %, chord 68 %, sequence 65 % | organ 78 %, bell 74 %, piano 73 %, chord 67 % |

The amp envelope medians per kind (section 4.1 has the full table) and the laws behind them:

- **Attack.** Under 5 ms is a click (plucks, bass, keys, leads: a 5 to 10 ms attack click is part of a lead's identity [LAW]). 20 to 70 ms is a soft edge (brass 6 ms HW, wind 33 ms, strings 101 ms HW). 250 to 800 ms is a swell (SW pads 257 ms median, swell-shaped pads 802 ms). Over 1.5 s is a texture. [WHY] the ear reads anything under about 10 ms as a transient and anything over about 100 ms as a bowed or blown onset.
- **Decay and sustain** decide the kind more than anything. Sustain 1.0 with any decay is a held tone (pads, leads, organ). Sustain 0 with decay 80 to 400 ms is a pluck; decay 1 to 3 s with sustain 0 is a piano; sustain 0.3 to 0.7 with decay 300 to 600 ms is brass, keys and stabs (the "punch then settle" shape).
- **Release.** Bass 18 ms HW / 31 ms SW; lead 16 / 69; pluck 39 / 113; keys 52 / 230; pad 270 / 742; strings 285; bell 306 HW / 901 SW [DATA]. [LAW] release at least as long as the attack on pads and strings, or the note-off is heard as a cut.
- **Curves.** Attack LOG for swells (reaches audibility early, then eases in); EXP for plucks and decays (the natural ring-down of a string or a filter); LINEAR reads as a machine. A pluck with a linear decay sounds like a gate; with EXP 2 it sounds struck.

**The filter envelope against the amp envelope** [DATA]:

- Its decay is shorter than the amp's in plucks (0.73 to 0.91x), basses (0.61x HW), bells (0.54x HW), drums (0.27x HW): the brightness goes before the level does, which is what makes a struck sound struck. [WHY] on a real string the high partials die first.
- Its decay is longer than the amp's in pads (2.56x HW, 1.04x SW): the colour keeps moving after the level has settled. That is the "it moves by 2 s" of a pad done with one envelope.
- Its release is longer than the amp's almost everywhere (1.2 to 2.9x): the filter is still closing as the note fades, so the tail darkens. Acid: 5.15x, the filter closes long after the note.
- Amounts: hardware 2.3 to 5.5 octaves per kind (plucks 5.2, keys 5.3, fx 5.5 the deepest; pads 3.4, organ 2.3 the shallowest); software 0.22 to 0.62 of the cutoff's travel (arp 0.62, bass 0.57, pluck 0.55; pad 0.36, bell 0.33, acid 0.22). Inverted (negative) amounts in 3 to 8 %, up to 33 % in HW chords: a filter that closes on the attack is a legitimate stab.

### 2.5 Movement: LFOs, PWM, drift, rows

Something must change by 2 s and something else by 8 s, from the engine alone, and never so much that the second note is a different patch. [LAW] The measured rates, by what they are for [DATA]:

| movement | destination | rate | depth | shape | kinds |
|---|---|---|---|---|---|
| vibrato | pitch | HW 3.06 Hz (the Virus and JP-8000 default, most kinds sit on it exactly); strings 4.85, brass 4.24, bell 4.47, wind 4.89; SW leads 6.86, plucks 6.14, bass 3.65 | 0 to +/-25 cents on the wheel; SW lead routes 0.13 of travel; pads 0.02 of travel (a drift, not a vibrato) | triangle (55 to 91 % of HW LFOs); sine in SW | leads 51 % HW, plucks 90 % HW (a blip), strings 52 %, organ 44 % |
| PWM | pulse width / shape | 0.4 to 2 Hz (HW pads 1.10, bass 1.00, lead 0.99, strings 1.39, piano 0.88, brass 0.71) | 0.36 (0.17 to 0.69) of the width | triangle | pads 60 % HW, strings 43 %, lead 46 %, piano 49 % |
| filter breath | cutoff | slow: pads 0.11 Hz SW (0.09 to 0.15), 1.03 Hz HW; arps 0.55 HW; acid 0.35 HW | 0.22 (pads SW) to 0.29 | triangle or sine | pads 31 to 41 %, keys 70 % HW (5.6 Hz: a tremolo on the filter) |
| wobble | cutoff, synced | 1/4 note (57 of 73 bass routes), 1/8 | 0.70 of travel (bass osc mix), 0.29 (cutoff) | square/step, drawn | SW bass, sequence, dubstep |
| tremolo | amp | 2.6 to 5.8 Hz (keys 2.57, lead 5.79, wind 5.98) | 0.1 to 0.35 | triangle, sine | keys 57 % HW, e-piano, organ (rotary) |
| autopan | pan | 0.2 to 0.5 Hz (pads 0.44, plucks 0.40, arps 0.24, leads 0.28) | 0.5 to 1 | triangle | pads 17 %, plucks 25 %, arps 28 %, acid 40 % HW |
| drift | fine, detune | 0.05 to 0.3 Hz, or FIRESAW DRIFT / GROUP DRIFT | a few cents | random or slow tri | every analogue-sounding patch |

- **Delayed vibrato.** The wheel brings the vibrato in; where the vibrato is in the patch, it starts 300 ms after the note (LFO delay or a row that ramps in). [WHY] a player does not shake the first 300 ms; immediate vibrato reads as a wobble.
- **One LFO on BLEND or MIX, not on level.** The density breathes, the loudness does not. [LAW] (ours: FIRESAW MIX, FIREBLOOM BODY)
- **Synced vs free.** Hardware LFOs are 92 % free; branded software LFOs on pitch are 32 to 65 % synced, on osc mix and cutoff 70 to 88 % synced [DATA]. Sync what is rhythm (wobble, gate, filter sequence); free what is organic (vibrato, drift, PWM). A free vibrato at 6 Hz against a 1/16 at 140 BPM (9.3 Hz) is exactly what makes the two readable as separate.
- **Rows (Tabula).** Every patch at least five rows that are heard (turning one off changes the sound by more than -30 dB over 6 s at 120 BPM) [LAW]. RIDE on by default so the knob stays the player's. The filter row synced to 2 or 4 bars on pads; BLEND stepped per bar on arps.

### 2.6 Playing: velocity, wheel, aftertouch, key tracking

Every patch must answer the hand. The research measured where real patches send it [DATA]:

| source | hardware (of the patches that use it) | software | the law |
|---|---|---|---|
| velocity | to the amp first in every kind (50 to 100 %); to the cutoff or the filter env amount 19 to 84 %, highest in arps (82 %), plucks (67 %), leads (51 %), acid (46 %) | basses, plucks, leads, acid and sequences send it to the cutoff as often as the amp or more (cutoff 42 to 100 % of their velocity routes) | velocity always does something audible, and on a pad never only volume [LAW]; plucks, keys, pianos, bells: velocity to brightness is the sound |
| mod wheel | pitch (vibrato) 45 to 66 % on pads, bass, leads; cutoff 35 to 54 % | cutoff 68 to 85 % on bass, lead, pluck, arp, acid; LFO depth 25 to 55 % on keys, organ, bells | leads: vibrato, no exceptions; bass, pluck, arp: cutoff; pads: open the Air; organ: drive or the scanner [LAW] |
| aftertouch | 0 to 5 % of patches; where used: cutoff 47 to 76 %, LFO depth | 0 to 21 %; LFO depth 60 to 87 % | should do something: vibrato depth on leads and strings, cutoff on brass and pads, the swell on CS-80 types [LAW] |
| release velocity | 1 route in 13,369 patches | none | new ground; nothing by default |
| key track | 70 % of all HW patches | on by default in most plugins | cutoff tracks pitch, on, measured at two points [LAW] |

Amounts: HW velocity to amp median 0.17 of range on pads, bass and leads, 0.41 on pianos [DATA]. A pad that jumps with velocity is a keyboard patch; a piano that does not is a toy.

### 2.7 Effects: how often, how much, and what decides

What real patches switch on, per kind (SW, heard, not merely stored) [DATA]:

| kind | reverb | delay | chorus | phaser | distortion | compressor | eq |
|---|---|---|---|---|---|---|---|
| pad | 76 % | 62 % | 44 % | 27 % | 20 % | 29 % | 58 % |
| bass | 37 % | 29 % | 25 % | 18 % | 50 % | 50 % | 70 % |
| lead | 77 % | 74 % | 37 % | 24 % | 42 % | 51 % | 78 % |
| keys | 52 % | 44 % | 36 % | 13 % | 6 % | 13 % | 26 % |
| pluck | 81 % | 85 % | 39 % | 22 % | 38 % | 57 % | 77 % |
| bell | 58 % | 77 % | 45 % | 8 % | 4 % | 28 % | 81 % |
| arp | 85 % | 85 % | 34 % | 21 % | 39 % | 54 % | 77 % |
| stab | 99 % | 61 % | 22 % | 21 % | 88 % | 65 % | 82 % |
| acid | 44 % | 67 % | 35 % | 11 % | 74 % | 58 % | 91 % |
| fx | 72 % | 63 % | 35 % | 17 % | 34 % | 18 % | 51 % |
| drums | 57 % | 23 % | 40 % | 7 % | 60 % | 32 % | 63 % |

Hardware banks: chorus 38 to 40 % (the most used effect: 81 % of HW keys, 84 % of strings, 66 % of brass), delay 29 to 32 %, reverb 23 to 24 %, distortion 14 to 17 % [DATA]. The difference between the two groups is the era: plugin presets are made with the mix bus inside the patch.

**Reverb.** Mix when on 0.34 (0.18 to 0.48); pads 0.44, plucks 0.38, arps 0.37, keys 0.35, leads 0.33, bass 0.25, stabs 0.18 [DATA]. Decay (RT60): pads 4.6 s, leads 3.9 s, plucks 3.5 s, bass 3.1 s, keys 1.5 s, fx 1.4 s, bells 6.8 s [DATA]. Pre-delay: pads 31 ms, leads 35 ms, plucks 43 ms, keys 27 ms, bells and drums 0 [DATA]. Low cut on the send: 120 Hz pads, 160 Hz leads, 180 Hz keys, 81 Hz bass [DATA]. The law [LAW]: pre-delay is a decision on every preset (0 to 10 ms drums, 20 to 40 ms pads and keys, 60 to 120 ms big); decay by family (room 0.4 to 0.9 s, plate 1.2 to 2.2, hall 2.5 to 4, big 5 to 8); send low-cut 150 to 250 Hz; high damp; width 70 to 85 %. [WHY] pre-delay keeps the attack dry so the note stays readable in front of its own tail; the low cut keeps the reverb from filling the bass the kick needs.

**Delay.** Mix when on 0.32 (0.12 to 0.49); feedback 0.41 (0.25 to 0.50); high cut 7.8 kHz, low cut 72 Hz [DATA]. Types: stereo and ping-pong share most of it. The law [LAW]: the time relations are the preset (1/4, 1/8 dotted, 1/8 triplet, 1/4 + 1/8-dotted L/R, 3/16 L + 1/4 R); synced per channel; feedback decides the category (10 to 20 % space, 30 to 45 % rhythm, 55 to 70 % wash); **HP 200 to 400 Hz and LP 3 to 6 kHz in the loop, always**; duck the rhythm and the wash (-24 dB, 300 ms) under plucks; PRE head 0 to 30 ms unsynced as the throw; the delay on a different subdivision than the arp. [WHY] a filtered loop darkens each repeat, which is what the ear expects of an echo; unfiltered repeats stack into mud.

**Chorus and ensemble.** Mix 0.29 (0.14 to 0.46); depth 0.40; rate 0.39 Hz (0.17 to 0.61); voices 2 to 4 [DATA]. Keys 0.50, pads 0.37, strings 0.47 at a slower 0.13 Hz with 0.69 depth (the ensemble) [DATA]. The law: chorus after the filter on pads (the Juno order), ensemble is the string machine's sound and goes before the reverb, no chorus under 150 Hz on a bass. [WHY] a chorus is a pitch wobble; under 150 Hz a pitch wobble is a tuning problem.

**Distortion and drive.** Mix 1.0 (0.40 to 1.0): it is an insert, not a send. Drive 0.30 (0.16 to 0.50); bass 0.29, lead 0.33, acid 0.38, drums 0.33 [DATA]. On in 50 % of basses, 42 % of leads, 74 % of acid, 88 % of stabs. Place it: after the filter for grit (the Moog law), before for warmth, in the delay loop for dub. [LAW]

**Compressor, EQ.** On in half of the basses, leads and plucks; the EQ in 70 to 90 % of everything in the plugin world [DATA]. On our machines the level is measured instead; a compressor in the patch only where the kind says so (sidechain in modern bass and pads; a fast compressor on Prodigy-type chains) [LAW].

**Phaser.** 0.08 Hz on pads (0.02 to 0.08), 0.5 Hz on leads and plucks; mix 0.3 [DATA]. Pads 27 %, pianos 45 % HW (the DX e-piano phaser) [DATA].

### 2.8 Levels, width and the low end

- -6 dBFS peak, four-note chord, velocity 100, limiter off. The bank within 1 LU. [LAW]
- Mono under 120 Hz; nothing under 40 Hz; no hole over 3 dB in 100 to 500 Hz on the mono sum. [LAW]
- Width comes from the Air and the effects, not from the Ground. Never pan the Ground. Pan the Air, centre the Body. [LAW]
- The reverb width 70 to 85 %, not 100: a fully wide reverb collapses on a phone. [LAW]
- Measured: the hardware Sub 37 takes had a spectral centre of 1,349 Hz median (590 to 1,791) and a first rise of 615 ms median. A patch much brighter than 2 kHz at centre is a lead or an FX; one darker than 500 Hz is a bass or a Ground. [DATA]

---

## 3. The categories

Each category: what the ear needs, which engine and roles, the filter, the envelopes with the measured numbers, the movement, the playing, the effects, the identity and the one imperfection, a starting recipe in Stellix terms, the mistakes that make it fail, and the variants. Every recipe value is a starting point; the gate (section 5) decides when it is done.

The envelope tables read: HW median (middle half) / SW median (middle half) / what we start from. HW filter amounts are octaves, SW are a share of the cutoff knob.

### 3.1 PIANO (acoustic)

**What the ear needs.** A hammer: a hard, short, bright strike whose brightness depends on how hard the key was hit; then a decay that is long in the bass and short at the top, with the high partials dying before the fundamental; a damper on release; a body (soundboard) under it all; and slightly out-of-tune strings per note (unison) that give the chorus-like shimmer of a real piano. Velocity is 80 % of a piano. [WHY]

**Engine and roles.** The PIANO engine (grand, upright, honky-tonk) is the sound; a subtractive piano is a 1980s keyboard sound, a different category (see 3.2 synth piano). Set the instrument's condition, not a synth voice:

- HAMMER 0.5 to 0.7 (harder is brighter and more percussive), POSITION 0.4 to 0.6 (where the hammer strikes decides which harmonics ring; 0.5 is the normal 1/7 to 1/8 point).
- DECAY 0.5 to 0.7 held, DAMPING 0.5 to 0.7 (how fast it stops on release), TWO STAGE 0.5 (the fast drop then the slow tail after release: this is what makes a release sound like a piano and not a gate).
- STRETCH 0.5 (highs sharp, lows flat, as a tuner does it; without it chords in the top octave sound flat), UNISON 0.4 to 0.6 (the three strings per note beating), SOUNDBOARD 0.5 to 0.7 (more is a bigger room inside the instrument).
- A PIANO always goes through the filter; keep it open (cutoff 0.9+, no resonance) with KT 100 % so the model's own brightness is what is heard, or use the filter with GLOW to add the velocity-to-brightness a cheaper model lacks.

**Second slot (optional).** A NOISE slot, PINK, BAND 0.6, WIDTH 0.3, level -24 dB, SWELL 0 / 40 ms / 0 / 20 ms, velocity 150 %: the hammer's felt knock, heard only at high velocity. A SUB TRIANGLE -1 oct at -18 dB under the bottom two octaves only (SPLIT) if the model's bass is thin in the mix.

**Filter.** Open. If a filter is used for colour: LP 12 dB (CASCADE), cutoff 0.75, resonance 0, KT 100 %, GLOW amount +0.3 with VEL 80 % so a hard hit opens it.

**Envelopes.** The model has its own; where a synth piano is built (3.2) these are the measured shapes [DATA]:

| stage | HW piano (158) | SW piano (15, few) | start from |
|---|---|---|---|
| SWELL attack | 1 ms (1 to 2) | 2 ms | 1 ms |
| SWELL decay | 970 ms (429 ms to 2.3 s) | 710 ms | 1.5 s, EXP 2 curve |
| SWELL sustain | 0 (0 to 0.017) | 0.41 | 0 (the note dies while held) |
| SWELL release | 33 ms (10 to 90) | 163 ms | 60 ms |
| GLOW amount | 4.2 oct (2.3 to 5.7) | 0.53 of travel | +0.5 |
| GLOW decay | 598 ms (152 ms to 1.5 s) | 248 ms | 500 ms (shorter than SWELL: the brightness dies first) |
| GLOW sustain | 0 (0 to 0.36) | 0.12 | 0 |
| GLOW release | 80 ms | 137 ms | 80 ms |

The HW shape split: 47 % pluck/percussive, 29 % decaying, 16 % sustained. The filter envelope is on in 66 % of HW pianos and its decay is 1.0x the amp's (middle half 0.22 to 1.23x): on a piano the two envelopes ride together or the filter goes first.

**Movement.** None by LFO on an acoustic piano beyond the instrument's own (UNISON beating). HW synth pianos: LFO to pulse width in 49 % at 0.88 Hz (the chorus), a phaser on in 45 % [DATA]: that is the DX / Rhodes piano of 1985, not a grand.

**Playing.** Velocity to level strongly (HW velocity used in 56 % of pianos, 81 % of those to the amp, median depth 0.41 of range, the most of any kind) and to brightness (cutoff 30 %, filter env amount 18 %) [DATA]. On the PIANO engine the model does this; measure that a v40 note and a v110 note differ by at least 12 dB and are audibly different in colour. Sustain pedal: PIANO SUSTAIN on CC64. No mod wheel by default; aftertouch nothing. Key tracking is inside the model.

**Effects.** Reverb room or small hall, pre-delay 55 ms (the SW pianos sit at 55 ms, the longest of any kind: the strike stays dry), decay 1.5 to 2.5 s, mix 0.25 to 0.33, low cut 150 Hz [DATA, LAW]. Delay rarely (a 1/8 at 0.1 under a ballad). No chorus on a grand; a slow chorus 0.3 Hz at 0.15 is what turns it into the 1980s piano. EQ: a gentle lift at 3 to 5 kHz if the model is dull. Compressor: none; the dynamics are the instrument.

**Identity and imperfection.** The hammer at high velocity is the identity. The imperfection: UNISON a little high so the mid register beats, or the honky-tonk model's detune.

**Starting recipe: "Hall Grand"**

- Slot, the piano: PIANO Grand, HAMMER 0.6, POSITION 0.5, DECAY 0.6, DAMPING 0.6, TWO STAGE 0.5, STRETCH 0.5, UNISON 0.5, SOUNDBOARD 0.6. Filter open, KT 100 %.
- Slot, the knock: NOISE PINK, BAND 0.6, WIDTH 0.3, -24 dB, SWELL 0 / 40 ms / 0 / 20 ms, VELOCITY 150 %.
- FX: reverb hall, pre-delay 55 ms, decay 2.2 s, mix 0.3, low cut 150 Hz.
- Variants: "Upright" (model Upright, HAMMER 0.4, SOUNDBOARD 0.4, room reverb 0.9 s), "Honky" (Honky Tonk, UNISON 0.8), "Felt" (HAMMER 0.2, DECAY 0.4, DAMPING 0.8, a 0.3 Hz chorus at 0.1, plate 0.35: the intimate felt piano).

**Mistakes.** Velocity flat (it is 80 % of the sound). Sustain above 0 on a piano shape (a piano never holds). Reverb without pre-delay (the strike drowns). A compressor (kills the one thing a piano has). Chorus on a grand (makes it an e-piano).

### 3.2 KEYS and E-PIANO (synth piano, tine, reed, clav)

**What the ear needs.** A struck note with a fast attack, a decay that is long enough to play chords (1 to 3 s) but dies while held, and a brightness that follows velocity much more than the level does: soft is a round bell, hard is a bark. Then a chorus or tremolo and a short room. [WHY] the tine and the reed are metal struck against a pickup; the pickup's curve is what makes the bark at high velocity, and that nonlinearity is the sound.

**Engine and roles.**

- **Tine e-piano:** FIRETINE. PICKUP 0.4 to 0.6 (near centre is bark, off centre is bell), GAP 0.5, BELL 0.4 to 0.6 (the ding at the strike), DECAY 0.5, DAMPER 0.4 to 0.6, NOISE 0.25, SCATTER 0.35 (every key its own), HAMMER 0.5, BASS 0.35, TREBLE 0.5, DRIVE 0.15 to 0.25, STAGE (direct) or SUITCASE (with the cabinet and the stereo tremolo). TREMOLO 4.5 to 5.5 Hz, DEPTH 0.3 to 0.5, STEREO 1 on a suitcase.
- **Reed e-piano:** FIREKEYS REED. BARK 0.5 to 0.7, SYMMETRY 0.3 (0 is hollow odd harmonics, up is sweeter), HAMMER 0.5, DECAY 3.5 s at C4, RELEASE 0.12 s, AGE 0.35, NOISE 0.3, TONE 0.5, DRIVE 0.2 to 0.4, TREMOLO 5.6 Hz depth 0.3 to 0.5.
- **Synth piano / FM piano** (the 1980s keyboard): FM, a piano or e-piano program, BRIGHT 0.8 to 1.2 with velocity to BRIGHT (velocity to brightness is the DX e-piano card [LAW]); or ANALOG PULSE width 0.3 with PWM 0.9 Hz, LP 12 dB, GLOW +0.4 VEL 80 %, chorus and phaser. A second slot ANALOG SINE or TRIANGLE +12 st at -12 dB with SWELL 0 / 300 ms / 0 / 100 ms is the tine's ding on a synth piano.
- **Clav:** ANALOG PULSE width 0.15 to 0.25, HP 150 Hz then LP 12 dB cutoff 0.6 resonance 0.3, GLOW 0 / 200 ms / 0.2, +0.5, VEL 80 %; SWELL 0 / 400 ms / 0.6 / 20 ms (the release is the damper: short); a wah (BP, cutoff on the wheel) or a phaser.

**Filter.** On the physical models, open or a gentle LP 12 dB at 0.8 as the amp's tone. On synth keys LP 12 dB (CASCADE), cutoff 0.5 to 0.65, resonance 0.1 to 0.25, KT 100 %, GLOW amount +0.4 to +0.6 with VEL 60 to 80 %: the filter envelope is on in 70 % of HW keys and its amount is 5.3 octaves median, the deepest of the melodic kinds [DATA].

**Envelopes** [DATA]:

| stage | HW keys (144) | SW keys (180) | start from (synth keys) |
|---|---|---|---|
| SWELL attack | 2 ms (1 to 4) | 7 ms (1 to 11) | 2 ms |
| SWELL decay | 327 ms (44 ms to 1.4 s) | 841 ms (351 ms to 1.8 s) | 1.2 s, EXP 2 |
| SWELL sustain | 0.25 (0 to 0.87) | 0.54 (0 to 0.88) | 0.2 (dies most of the way, keeps a floor for held chords) |
| SWELL release | 52 ms (11 to 438) | 230 ms (24 ms to 1.2 s) | 150 ms |
| GLOW amount | 5.3 oct (4.3 to 6.8) | 0.41 (0.20 to 0.58) | +0.5, VEL 70 % |
| GLOW decay | 661 ms (126 ms to 2.1 s) | 565 ms (158 ms to 1.5 s) | 500 ms (0.4x the amp's: the bark fades first) |
| GLOW sustain | 0.21 (0 to 0.48) | 0.11 (0 to 0.5) | 0.1 |
| GLOW release | 400 ms | 482 ms | 300 ms |

Shapes: HW keys 40 % sustained, 33 % pluck, 15 % decaying (2.5x the group); SW keys 20 % decaying (4.9x). The filter decay is 0.68x the amp's in SW keys, 1.06x in HW.

**Movement.** The tremolo is the keys' movement: LFO to amp in 57 % of HW keys at 2.57 Hz (1.8 to 5.5) [DATA], the suitcase's stereo tremolo at 4.5 to 5.6 Hz on the models. LFO to cutoff in 70 % of HW keys at 5.64 Hz (4.5 to 6.0): a filter tremolo, the DX e-piano through a tremolo pedal [DATA]. PWM at 1.0 Hz on synth keys. The 8 s movement is the decay itself on held chords; nothing slower is needed.

**Playing.** Velocity to the amp (81 % HW, 76 % SW) and to the cutoff (17 to 24 %) [DATA]; on the models velocity is the timbre by construction. Measure v40 against v110: level and colour both change. Mod wheel: tremolo depth (SW keys send the wheel to LFO depth in 33 %), or chorus mix. Aftertouch: used in 16 % of SW keys, to LFO depth [DATA]: the tremolo deepens under pressure. Key tracking inside the model; 100 % on synth keys.

**Effects.** Chorus is the keys' effect: on in 81 % of HW keys, mix 0.77 HW, 0.50 SW (the highest chorus mix of any kind), depth 0.48, rate 0.6 Hz, 4 voices [DATA]. Phaser at 0.125 Hz on 13 % (the Rhodes through a Small Stone). Reverb plate or room, pre-delay 27 ms, decay 1.5 s (0.7 to 3.3), mix 0.35, low cut 180 Hz [DATA]: the shortest reverb of the melodic kinds, because the chorus already fills the space. Delay in 44 %, 1/8 or 1/4 at 0.25, feedback 0.37 [DATA]. Distortion almost never (6 %); the model's own DRIVE instead. The suitcase's cabinet is the amp.

**Identity and imperfection.** The bark at high velocity (the pickup curve) is the identity. The imperfection: SCATTER / AGE so no two keys are the same, or a tremolo that is slightly off the tempo.

**Starting recipe: "Velvet Keys"** [LAW]

- Slot, the tine: FIRETINE STAGE, PICKUP 0.45, GAP 0.5, BELL 0.5, DECAY 0.5, DAMPER 0.4, NOISE 0.25, SCATTER 0.35, HAMMER 0.5, BASS 0.35, TREBLE 0.5, DRIVE 0.2, TREMOLO RATE 5 Hz, DEPTH 0.35, STEREO 1.
- Playing: velocity to brightness is the sound; wheel to tremolo depth.
- FX: chorus 0.2 (rate 0.5 Hz, 2 voices), reverb plate 0.25, pre-delay 25 ms, decay 1.6 s.
- Variants: "Suitcase" (AMP SUITCASE, DRIVE 0.3, TREMOLO DEPTH 0.5), "Reed Bark" (FIREKEYS, BARK 0.7, DRIVE 0.4, phaser 0.3 at 0.15 Hz), "Glass Piano" (FM e-piano program, BRIGHT 1.0, velocity to BRIGHT +0.6, SWELL 0 / 2 s / 0 / 300 ms, chorus 0.3, plate 0.3), "Clav Funk" (the clav above, wah on the wheel: BP cutoff 0.3 to 0.8).

**Mistakes.** Velocity to level only (the colour must change or it is an organ with a decay). Hall reverb (a keys patch lives in a room with a chorus). Sustain 1.0 (then it is a pad with a click). The same brightness on every key (SCATTER 0, AGE 0: a sampler, not an instrument).

### 3.3 ORGAN

**What the ear needs.** A gate: instant on, full while held, instant off, no velocity. Harmonics as footages (octaves and fifths of the note), a key click, a percussion ping on the first note of a phrase, leakage, a scanner vibrato or chorus, and a valve preamp that gets dirtier the more keys are down. The instrument is a mixer of sines; the sound is the drawbar recipe and the amp. [WHY]

**Engine and roles.** FIREWHEEL. The drawbar recipe is the patch:

| recipe | drawbars (16' 5 1/3' 8' 4' 2 2/3' 2' 1 3/5' 1 1/3' 1') | percussion | vibrato | use |
|---|---|---|---|---|
| Sunday / gospel | 8 8 8 0 0 0 0 0 0 | on, 3RD, FAST, SOFT | C3 | the default [LAW] |
| jazz | 8 8 8 0 0 0 0 0 0 or 8 3 8 0 0 0 0 0 0 | on, 2ND, FAST, NORMAL | C3 or off | comping |
| full / rock | 8 8 8 8 8 8 8 8 8 | off | C3 | the wall; DRIVE 0.5+ |
| whistle | 0 0 8 8 0 0 0 0 0 | off | V2 | a soft lead |
| flute | 0 0 8 0 0 0 0 0 0 | off | off | a sine with a click |
| house | 8 8 8 8 0 0 0 0 0 | on, 2ND, SLOW, NORMAL | C1 | stabs, through a short chorus and a plate |

Plus CLICK 0.4 to 0.6, LEAK 0.3 to 0.4 (a clean generator sounds like a plugin), DRIVE 0.2 (gospel) to 0.6 (rock), EXPRESSION on a pedal or the wheel, VEL 0 (a real organ has none; up to 0.2 for a player who wants a little), BASS FOLD on, TUNING WHEELS. A second slot is rarely needed; a NOISE slot at -36 dB with SWELL 0 / 10 ms / 0 / 5 ms adds a key-contact burst if CLICK is not enough.

**Synth organ** (the Juno / Polysix organ): ANALOG SQUARE in two slots at 0 and +12 st (or DUAL SINE with SHAPE), a third at +19 st (the 2 2/3') at -9 dB, filter open or LP 24 at 0.8, SWELL 1 ms / 0 / 1.0 / 5 ms, chorus 0.4. The HW organ data is mostly this: a gate in 57 %, amp attack spread the lowest of any kind (0.05), filter envelope in 42 % but at 2.3 octaves, the shallowest [DATA].

**Filter.** None on FIREWHEEL (the drawbars are the filter). On a synth organ a static LP at 0.7 to 0.9, no GLOW, or a short GLOW (decay 21 ms HW median) as the click.

**Envelopes** [DATA]:

| stage | HW organ (154) | SW organ (27) | start from |
|---|---|---|---|
| SWELL attack | 1 ms (1 to 2) | 11 ms | 1 ms |
| SWELL decay | 162 ms | 80 ms | any; sustain decides |
| SWELL sustain | 1.0 (0.71 to 1.0) | 0.80 | 1.0 |
| SWELL release | 2 ms (2 to 11) | 65 ms | 5 ms (a gate; the room gives the tail) |
| GLOW | on in 42 %, 2.3 oct, decay 21 ms | 0.44, decay 163 ms | off, or decay 20 ms as a click |

34 % of HW organs leave the amp envelope exactly at the machine's default: the envelope is not where an organ lives.

**Movement.** The scanner (V1 to V3 vibrato, C1 to C3 chorus at 6.86 Hz) is the organ's movement, and the percussion's decay (FAST 1 s, SLOW 4 s) is the only envelope. HW organs: LFO to pitch in 44 % at 3.06 Hz, to pan in 27 % at 0.81 Hz (the rotary cabinet) [DATA]. A rotary: LFO to pan and to a gentle cutoff at 0.8 Hz slow, 6.5 Hz fast, with the wheel switching between them (ramp 1 to 2 s).

**Playing.** Velocity off (HW organs use it in 14 %) [DATA]. The wheel: EXPRESSION, or DRIVE, or the rotary speed. Aftertouch: nothing, or the scanner depth. The percussion is single-trigger: a legato phrase gets it once; play staccato to hear it on every note.

**Effects.** Reverb room or hall, pre-delay 27 ms, mix 0.3 to 0.47 (SW organs 0.47) [DATA]; the rotary cabinet's room. Chorus 0.46 at 0.18 Hz (slow) in 48 % of SW organs [DATA], or the scanner instead, never both. Delay on 81 % of SW organs at a high mix (1.0 median: a slapback or a doubling) [DATA]. Distortion: the preamp's DRIVE, not an effect; a tube amp model after it for rock.

**Identity and imperfection.** The percussion ping and the click. The imperfection: LEAK, and the fold-back of the top footages (the wheels run out).

**Starting recipe: "Sunday Organ"** [LAW]

- FIREWHEEL: 8 8 8 0 0 0 0 0 0, PERCUSSION on 3RD FAST SOFT, VIBRATO C3, LEAK 0.35, DRIVE 0.2, CLICK 0.5, EXPRESSION on the wheel.
- FX: reverb room 0.2, pre-delay 20 ms, decay 0.9 s.
- Variants: "Full Rock" (all 8, DRIVE 0.6, rotary fast on the wheel), "Jazz Trio" (8 3 8 0 0 0 0 0 0, 2ND percussion), "House Stab" (8 8 8 8 0 0 0 0 0, SWELL release 60 ms, plate 0.3, delay 1/8 0.2, a 0.2 Hz phaser).

**Mistakes.** Velocity on (an organ with velocity is a synth). An ADSR with a slow attack (a pad). Reverb hall at 0.5 (the wall washes out; organs live in rooms and cabinets). Chorus plus scanner (two wobbles beat against each other).

### 3.4 STRINGS

**What the ear needs.** Many bows, none in time with the others: a slow onset (100 to 300 ms), a sustained body that keeps moving (vibrato at 4 to 5 Hz, slow detune), a release that is a bow lifting (300 ms to 1 s), and brightness that follows the bow pressure (velocity to the cutoff). An ensemble sounds like a section because every player is a little off in pitch and time; one saw is one violin. [WHY]

**Two kinds.** The **orchestral section** (FIRESAW groups drifting, LP 12, slow envelopes, hall) and the **string machine** (pulse, PWM, ensemble: Solina, Juno strings), which is its own identity and must not be given a filter envelope [LAW]. The HW strings data is both: 172 patches, amp swell 29 %, sustained 52 %, chorus on 84 % at mix 0.67, LFO to pitch in 52 % at 4.85 Hz, faster than pads, basses and leads at 3.1 to 3.4 Hz [DATA].

**Engine and roles.**

- Section, violins: FIRESAW, SAWS 21, SPLIT 3, DETUNE 0.2, MIX 0.5, GROUP DRIFT 0.3 (three groups wandering against each other: that is the section). Cellos: the same -12 st at -6 dB, cutoff lower (0.4). A violas slot at -5 st (a fourth down) at -9 dB if the chord needs filling.
- Machine: ANALOG PULSE, WIDTH 0.35, VOICES 7, DETUNE 0.2; or two PULSE slots at WIDTH 0.3 and 0.4 detuned 7 cents, each with its own PWM at different rates (0.9 and 1.4 Hz) so the notches never line up.
- A NOISE slot (PINK, BAND 0.7, WIDTH 0.4, -30 dB, SWELL 300 ms / 1 s / 0.3 / 500 ms) is the bow hair; heard, not noticed.

**Filter.** LP 12 dB (CASCADE), cutoff 0.55 to 0.6, resonance under 0.1, KT 70 % (a tracked section keeps the cellos dark and the violins bright). The section may use a slow GLOW (attack 1 to 1.5 s, +0.15) as the bow digging in; the machine none: the HW strings filter envelope is on in 48 % only and its amount is 2.7 octaves, the shallowest after organ [DATA]. Velocity to cutoff instead of a filter envelope: 52 to 56 % of HW strings velocity routes go to the cutoff [DATA].

**Envelopes** [DATA]:

| stage | HW strings (172) | start from (section) | start from (machine) |
|---|---|---|---|
| SWELL attack | 101 ms (21 to 241) | 250 ms, LOG | 300 ms |
| SWELL decay | 245 ms | 1 s | 1 s |
| SWELL sustain | 0.85 (0.46 to 1.0) | 0.9 | 1.0 |
| SWELL release | 285 ms (59 to 754) | 1.2 s (at least the attack) | 1.0 s |
| GLOW amount | 2.7 oct (1.4 to 5.3) | +0.15, attack 1.2 s | none |
| GLOW attack / decay / sustain / release | 8 ms / 308 ms / 0.21 / 236 ms | 1.2 s / 2 s / 0.6 / 1 s | - |

The filter attack is 0.28x the amp's in HW strings: where a filter envelope is used it opens before the level arrives, so the swell is already bright when it is heard. [DATA]

**Movement.** Vibrato on pitch at 4.85 Hz (4.0 to 5.2) in 52 % of HW strings, delayed 300 ms, depth small (+/-6 to 10 cents; the ensemble widens it) [DATA, LAW]. PWM at 1.39 Hz (0.7 to 6.1) in 43 %, depth 0.3 to 0.4 of the width [DATA]. GROUP DRIFT on FIRESAW is the 8 s movement; on the machine a 0.05 Hz LFO on the ensemble rate. A slow LFO to cutoff (0.1 Hz, +/-5 %) is the hall breathing.

**Playing.** Velocity to the amp (70 %) and the cutoff (52 %) gently: a loud bow is a brighter bow [DATA]. Wheel: the vibrato depth, or the Air (cutoff +0.15) on a section. Aftertouch: vibrato depth (the 5 % of HW strings that use aftertouch send it to the cutoff and LFO depth) [DATA]. Legato mode with no glide; a 20 ms glide only on a solo-cello patch.

**Effects.** The ensemble: MOD as ensemble 0.4 to 0.5 (chorus depth 0.69 at 0.13 Hz with 0.26 feedback is the SW strings median: slow, deep, three-phase) [DATA]. Reverb hall, pre-delay 30 ms (SW strings 169 ms in the few presets: a very far section), decay 3 s, mix 0.35 to 0.65 (SW strings 0.65, the highest reverb mix of any kind), low cut 200 Hz, high damp [DATA, LAW]. Delay 1/4 dotted at 0.15 under a slow part, or none. No distortion, no compressor.

**Identity and imperfection.** Section: three drifting groups make the section. Machine: the ensemble shimmer. The imperfection: one group a little late (Air slot attack +100 ms), or the ensemble's own rate slightly unsteady.

**Starting recipes** [LAW]

- **"Grand Ensemble"**: violins FIRESAW SAWS 21 SPLIT 3 DETUNE 0.2 MIX 0.5 GROUP DRIFT 0.3, LP 12 cutoff 0.55 KT 70 %, no GLOW, SWELL 250 ms / 1 s / 0.9 / 1.2 s; cellos the same -12 st -6 dB cutoff 0.4; MOD ensemble 0.4; reverb hall 30 ms / 3 s / 0.35.
- **"Pulse Strings"**: ANALOG PULSE WIDTH 0.35 VOICES 7 DETUNE 0.2, LP 12 cutoff 0.6, SWELL 300 ms / 1 s / 1.0 / 1.0 s, PWM 1.2 Hz depth 0.3; MOD ensemble 0.5 (the sound itself); reverb hall 0.3. No filter envelope.
- Variants: "Solo Cello" (one FIRESAW SAWS 3, -12 st, vibrato 5 Hz on the wheel, glide 20 ms legato, room reverb), "Tape Strings" (Pulse Strings through HEAT PRE 0.2 and a 0.3 Hz flutter on fine, LP cutoff 0.45, plate 0.4: the Mellotron), "Octave Strings" (section plus Air FIRESAW +12 st HP 1 kHz -9 dB attack 600 ms).

**Mistakes.** A filter envelope on a string machine (it becomes a brass or a pad). Release shorter than attack (the bow is cut). No vibrato (a saw is not a string until it moves). Resonance over 0.2 (a string section has no peak). Reverb low cut off (the cellos drown the bass).

### 3.5 PAD

**What the ear needs.** Three things at different distances, never one thing made wider [LAW]: a Body close and still, an Air far and moving above it, a Ground under both. A slow onset (250 ms to 1 s), a long release, movement that is slow (0.1 Hz) and continuous, and a space that is big but does not fill the low end. A pad is heard for 8 bars at a time, so it must change over 8 s without the second chord being a different patch. [WHY] the ear stops hearing a static tone after about 2 s; a pad that does not move disappears.

**The data says** [DATA]: SW pads 53 % swell shape (5.1x the group), attack 257 ms median (11 to 845), release 742 ms; 78 % have a routed LFO (the most of any branded kind), LFO to wave morph in 51 % and to cutoff in 35 % at 0.11 Hz; chorus on 44 % SW / 65 % HW, reverb on 76 % at mix 0.44 and decay 4.6 s, the longest of the melodic kinds; the mod wheel in 44 % of SW pads to the cutoff (72 %). The ones the author liked: pads were the best-liked melodic kind (55 %), and slow attack and reverb were the two traits most over-represented among liked patches [EAR].

**Engine and roles** [LAW]:

- **Body:** one slot, FIRESAW (SAWS 14, SPLIT 2, DETUNE 0.25, MIX 0.4 so the supersaw sits behind, GROUP DRIFT 0.2) or ANALOG SAW VOICES 3 DETUNE 0.15, or FIREBLOOM (BITS 0.2, EDGE mid, MOTION CHORUS 0.5, BODY 0.7, FADE 0.4: the Stellix pad nobody else can make). LP 24 dB, cutoff 0.4 to 0.5, resonance 0.1 to 0.2, KT 50 %. Centre, never panned.
- **Air:** second slot +12 st (an octave up), FIRESAW SAWS 7 MIX 0.8 SPREAD 1.0 or ANALOG PULSE with PWM, high-passed at about 1 kHz, -9 dB, SWELL attack 300 ms longer than the Body's, panned or spread wide. The wheel opens it. DOUBLE is the cheap Air; never both.
- **Ground:** SUB SINE or TRIANGLE -1 oct, -6 dB, mono, no filter, attack 50 ms: it is already there when the Body arrives.
- **Warmth is a filter law** [LAW]: LP 24, cutoff 0.35 to 0.55, resonance 0.1 to 0.2, GLOW +0.15 to +0.25 with a 1 to 2 s attack; chorus after the filter (the Juno order).

**Filter.** LP 24 dB (SUPER) on the Body, cutoff 0.45, resonance 0.15, KT 50 %. HP on the Air at 0.55 to 0.6 (about 1 kHz). None on the Ground. The cutoff is modulated in 82 % of SW pads and 62 % of HW pads [DATA]; a pad filter that sits still is wrong.

**Envelopes** [DATA]:

| stage | HW pad (566) | SW pad (761) | start from (Body) | Air | Ground |
|---|---|---|---|---|---|
| SWELL attack | 58 ms (10 to 238) | 257 ms (11 to 845); swell-shaped 802 ms | 500 ms, LOG | 800 ms | 50 ms |
| SWELL decay | 141 ms | 702 ms (28 ms to 3.1 s) | 700 ms | 1 s | 0 |
| SWELL sustain | 1.0 (0.57 to 1.0) | 1.0 (0.75 to 1.0) | 0.8 | 0.8 | 1.0 |
| SWELL release | 270 ms (98 to 706) | 742 ms (209 ms to 1.3 s) | 1.5 s | 2 s | 1 s |
| GLOW amount | 3.4 oct (1.6 to 4.9), on in 53 % | 0.36 (0.22 to 0.50), on in 52 % | +0.2 | +0.1 | none |
| GLOW attack | 13 ms (1 to 368) | 364 ms (7 ms to 1.7 s); swell-shaped 1.58 s | 1.5 s | 1 s | - |
| GLOW decay | 563 ms (173 ms to 1.8 s) | 1.1 s (320 ms to 3.8 s) | 2 s | 2 s | - |
| GLOW sustain | 0.10 (0 to 0.43) | 0.25 (0 to 0.76) | 0.6 | 0.5 | - |
| GLOW release | 565 ms | 1.22 s (415 ms to 3.2 s) | 1 s | 1.5 s | - |

The HW pads are faster than the SW ones (58 ms attack) because 51 % of them are sustained Juno-type pads with the swell left to the chorus and the hall; the SW world builds the swell into the envelope. Both work; the slow one is what the author's ear picked. The filter decay is 2.56x the amp's in HW pads [DATA]: the colour keeps moving after the level has settled.

**Movement** (at least two, from the engine) [LAW, DATA]:

- 2 s: PWM on the Air (1.1 Hz HW, depth 0.36), or FIRESAW GROUP DRIFT, or FIREBLOOM MOTION.
- 8 s: one LFO 0.05 to 0.15 Hz on the Body's cutoff, +/-5 to 10 % (SW pads 0.11 Hz, depth 0.22) [DATA]; or on BLEND / FIRESAW MIX (the density breathes, the loudness does not: ours).
- Slow pitch drift: HW pads route an LFO to pitch in 54 %, but at a depth of 0.02 of travel in SW (a drift, not a vibrato), 0.3 Hz [DATA]. Never a vibrato on a pad.
- Autopan on the Air at 0.44 Hz (17 % of HW pads) [DATA]. Never on the Ground.
- A phaser at 0.08 Hz (27 % of SW pads, mix 0.26) is a legitimate 8 s movement [DATA].

**Playing.** Velocity: gently to the amp (HW median 0.17 of range), plus a little to the filter envelope amount (54 % of HW pad velocity routes) [DATA]; never only volume [LAW]. Wheel: opens the Air (cutoff +0.2 on the Air, or its level +6 dB) and the vibrato on nothing; SW pads send the wheel to the cutoff in 72 % [DATA]. Aftertouch: LFO depth (60 % of SW pad aftertouch routes) or the cutoff [DATA]. Release velocity: the Stellix idea of let-go opening the space is ours and untested.

**Effects** [DATA, LAW]: chorus after the filter on Body and Air, 0.15 to 0.37 (SW 0.37, 3.5 voices, 0.5 Hz), on 44 to 65 %. Reverb hall, pre-delay 20 to 40 ms (SW 31 ms), decay 2.5 to 4 s (SW 4.6 s), mix 0.3 to 0.45 (SW 0.44), send low-cut 200 Hz (SW 120 Hz), high damp. Long dotted delay (1/4 dotted or 1/2 dotted) at 0.15 to 0.25 under the pad, filtered. Distortion in 20 % at a low mix (0.39, drive 0.2): a little HEAT PRE 0.1 on the Body is warmth, nothing more. Pan the Air, centre the Body, never pan the Ground.

**Identity and imperfection.** The Air opening above a still Body; or FIREBLOOM's own motion. The imperfection: a late second lane (the Air 300 ms behind), two groups drifting, or the Air's PWM not quite periodic.

**Starting recipes** [LAW]

- **"Wide Horizon"**: Body FIRESAW SAWS 14 SPLIT 2 DETUNE 0.25 MIX 0.4 GROUP DRIFT 0.2, SUPER LP 24 cutoff 0.45 reso 0.15 KT 50 %, GLOW 1.5 s / 2 s / 0.6 / 1 s +0.2, SWELL 500 ms / 700 ms / 0.8 / 1.5 s. Air FIRESAW SAWS 7 +12 st MIX 0.8 SPREAD 1.0, HP 1 kHz, -9 dB, attack 800 ms. Ground SUB SINE -1 oct -6 dB mono no filter attack 50 ms. FX on Body and Air: chorus after the filter 0.2, reverb hall 30 ms / 3.5 s / 0.40 low cut 200 Hz high damp, delay 1/4 dotted 0.2. Wheel opens the Air.
- **"Ember Bloom"**: FIREBLOOM BITS 0.2 EDGE mid MOTION CHORUS 0.5 BODY 0.7 FADE 0.4, LP 24 cutoff 0.5, SWELL 400 ms / 1 s / 0.8 / 2 s; SUB TRIANGLE -1 oct -8 dB mono; reverb hall 0.45 4 s, delay 1/2 dotted 0.25. Identity: FIREBLOOM's motion; nothing else makes this.
- **"Juno Pad"** (the card): two ANALOG, one SAW one PULSE WIDTH 0.4 with PWM 0.9 Hz depth 0.35, 5 cents apart; SUB SQUARE -1 oct -9 dB; LP 24 cutoff 0.42 reso 0.12 KT 50 %, GLOW 800 ms / 1.5 s / 0.5 / 1 s +0.2; SWELL 300 ms / 1 s / 1.0 / 1 s; chorus after the filter 0.5 (the Juno II chorus is the sound); hall 0.3.
- Variants: "Glass Pad" (Air at +24 st SINE-ish FIREBLOOM BITS 0.6, Body dark at 0.35), "Dark Drone" (no Air, Body cutoff 0.3, Ground -2 oct, attack 2 s, big reverb 6 s), "Vox Pad" (Body through BP cutoff 0.45 width 0.4 with a 0.07 Hz LFO on cutoff +/-0.1: a vowel that drifts).

**Mistakes.** One thing made wider (a unison stack on one slot and nothing else: [EAR] -16 points). A vibrato (a pad shivers; it does not sing). Velocity to volume only. Release shorter than attack. Reverb without a low cut (the Ground doubles in the tail). Everything panned (then nothing is wide). Resonance over 0.25 (a pad with a peak is a lead). A static filter.

### 3.6 LEAD

**What the ear needs.** One voice that cuts: a bright, slightly edgy tone with a fast attack (a 5 to 10 ms click), a sustain that holds for the phrase, a vibrato that the player brings in on the wheel after the note has landed, a little glide between legato notes, and a space (delay first, then reverb) that makes one note sound like a line. Two lanes and one identity [LAW]: the supersaw is the lead, the edge is a second slot high-passed and quiet. [WHY] a lead is heard in the mix's busiest band (500 Hz to 4 kHz), so it needs a peak there (LP 12, not 24) and movement the ear can follow (vibrato at 5 to 7 Hz, the rate of a singer's).

**The data says** [DATA]: 1,272 SW leads: sustained 48 %, gate 39 %, attack 2 ms, release 69 ms; filter envelope on 62 % at 0.50 of travel with decay 227 ms; LFO to pitch in 57 % at 6.86 Hz (HW leads 3.23 Hz: the older vibrato is slower); mod wheel in 47 % to cutoff (68 %) and LFO depth (25 %); delay on 74 %, reverb 77 %, distortion 42 % at drive 0.33, chorus 37 %; the HW LFO rate is the most varied lead control (spread 0.57): the vibrato is where leads differ most.

**Engine and roles** [LAW]:

- **The lead (lane 1):** FIRESAW (SAWS 14, SPLIT 2, DETUNE 0.35, MIX 0.7, SPREAD 0.5, GROUP DRIFT 0.15, DRIFT 0.1) for the trance / big-room lead; ANALOG SAW VOICES 3 DETUNE 0.15 for the analogue lead; ANALOG PULSE WIDTH 0.3 with PWM for the reedy lead; FM (a brass or bell program, BRIGHT 1.2) for the digital lead; ANALOG with SYNC (FIREBLOOM SYNC 0.6) for the hard sync lead (Prophet card: GLOW to the sync pitch).
- **The edge (lane 2):** ANALOG PULSE or SQUARE +12 st, HP about 400 Hz, -6 dB against lane 1, no unison. It gives the top without a second supersaw.
- **The floor (optional, screaming leads):** SUB SQUARE -1 oct -12 dB, no filter: the Burn Lead's floor.
- Mono or two-voice legato, glide 30 to 80 ms (the data's lead glide: 19 % of branded leads have a glide macro at 0.41 of travel) [DATA, LAW]. Glide is off by default on every other kind [LAW: L105].

**Filter.** LP 12 dB (CASCADE) for the classic lead: cutoff 0.55 to 0.75, resonance under 0.15, KT 100 %. BURN LP for the Stellix scream: cutoff 0.55, resonance 0.6, HEAT and SCREAM up, DAMAGE on velocity. GLOW +0.25 to +0.4, VEL 50 to 60 %: the HW lead filter envelope is 4.0 octaves, SW 0.50 of travel [DATA]. The cutoff is modulated in 84 % of SW leads [DATA].

**Envelopes** [DATA]:

| stage | HW lead (657) | SW lead (1272) | start from |
|---|---|---|---|
| SWELL attack | 1 ms (1 to 4) | 2 ms (1 to 6) | 5 ms (the click) |
| SWELL decay | 86 ms (2 to 675) | 410 ms (0 ms to 1 s) | 576 ms |
| SWELL sustain | 1.0 (0.47 to 1.0) | 1.0 (0.52 to 1.0) | 0.85 |
| SWELL release | 16 ms (4 to 117) | 69 ms (15 to 200) | 80 ms |
| GLOW amount | 4.0 oct (2.0 to 6.3), on 58 % | 0.50 (0.30 to 0.79), on 62 % | +0.25, VEL 50 % |
| GLOW attack | 1 ms | 1 ms (1 to 28) | 1 ms |
| GLOW decay | 162 ms (20 to 892) | 227 ms (87 to 699) | 570 ms |
| GLOW sustain | 0.18 (0 to 0.47) | 0.08 (0 to 0.36) | 0.4 |
| GLOW release | 102 ms | 156 ms (24 to 773) | 85 ms |

The gate shape (36 % HW, 39 % SW): many leads are a pure gate with the filter doing all the shaping. The filter release is 2.88x the amp's in HW leads: the tail darkens as it goes [DATA].

**Movement.** The wheel vibrato: 5 to 6.5 Hz, 0 to +/-25 cents, 300 ms LFO delay [LAW]; SW leads sit at 6.86 Hz (3.3 to 44: the top is a trill or a pitch FM) [DATA]. PWM at 1 Hz on a pulse lead (46 % of HW leads) [DATA]. Osc mix stepped at 1/2 or 1/4 on 14 % of branded leads (a rhythmic lead) [DATA]. FIRESAW DRIFT is the 8 s movement on a held note. The mod wheel is the classic lead control and it goes to vibrato depth, no exceptions [LAW].

**Playing.** Velocity to the filter envelope amount and the amp equally (HW 51 % and 49 %); SW leads: amp 43 %, cutoff 41 % [DATA]. On BURN, velocity also opens DAMAGE. Wheel = vibrato. Aftertouch = vibrato depth too, or the cutoff (76 % of HW lead aftertouch routes) [DATA]. Pitch bend +/-2 st (a lead player bends a tone; +/-12 only for the dive).

**Effects** [DATA, LAW]: HEAT PRE 0.3 (or distortion 0.46 at mix 1.0: the data's lead median is drive 0.33 at mix 1.0, on in 42 %). Chorus 0.17 to 0.26 at 0.6 Hz, 3 voices. Delay first: 1/8 dotted at 0.19 to 0.26, feedback 0.44, filtered in the loop (HP 300, LP 5 k), on 74 %. Reverb on the send: plate, pre-delay 30 to 35 ms, decay 2 s (SW 3.9 s), mix 0.3, low cut 160 to 200 Hz. The macro the makers reach for most on a lead is the reverb mix (69 % of branded leads) [DATA].

**Identity and imperfection.** The drifting double supersaw (Solar Lead) or the BURN scream at high velocity (Burn Lead). The imperfection: the two groups wander; or self-oscillation at the top of the wheel; or the delay saturating.

**Starting recipes** [LAW]

- **"Solar Lead"**: lane 1 FIRESAW SAWS 14 SPLIT 2 DETUNE 0.35 MIX 0.7 SPREAD 0.5 GROUP DRIFT 0.15 DRIFT 0.1, CASCADE LP 12 cutoff 0.65 reso 0.1 KT 100 %, GLOW 1 ms / 570 ms / 0.4 / 85 ms +0.25 VEL 50 %, SWELL 5 ms / 576 ms / 0.85 / 80 ms. Lane 2 ANALOG PULSE +12 st HP 400 Hz -6 dB. Mono legato glide 50 ms; wheel = vibrato 5.5 Hz 0 to +/-25 c, 300 ms delay. HEAT PRE 0.3, chorus 0.17, delay 1/8 dotted 0.19 filtered, reverb plate 0.30 pre 30 ms low cut 200 Hz.
- **"Burn Lead"**: ANALOG SAW VOICES 3 DETUNE 0.15, BURN LP cutoff 0.55 reso 0.6 HEAT and SCREAM up KT 80 %, GLOW 1 ms / 300 ms / 0.3 / 85 ms +0.4 VEL 60 %; SUB SQUARE -1 oct -12 dB; mono legato glide 40 ms; wheel vibrato; velocity opens DAMAGE; distortion 0.46, delay 1/8 dotted 0.2, plate 0.3.
- **"Voodoo Lead"** (the JD-800 card [PUB]): ANALOG PULSE narrow (WIDTH 0.15), resonance 0.7, filter drive full, GLOW to cutoff +0.4 decay 70 ms sustain 0, KT 60 to 100 %, distortion before the filter, plate after.
- **"Hoover"** (the Alpha Juno card [PUB]): two PULSE slots, one +24 st, SUB TRI -1 oct loud, VOICES 4 at 21 cents, BP cutoff 0.65 reso 0.4, KT 70 %, bend +/-5 st, a pitch sweep down into the note (FIREBASS BEND -12 st over 300 ms on a FIREBASS slot, or a row).
- Variants: "Sync Lead" (FIREBLOOM SYNC 0.6 with GLOW on SYNC +0.5 decay 200 ms), "FM Lead" (FM brass program BRIGHT 1.3, velocity to BRIGHT, chorus 0.3), "Soft Lead" (ANALOG TRI + SAW -12 st, LP 24 cutoff 0.5, no edge, delay 1/4 0.3: the Vangelis CS-80 lead with aftertouch to cutoff and vibrato).

**Mistakes.** No vibrato on the wheel (fails review). LP 24 on a lead (it loses the band it lives in). Two supersaws (two identities: louder, not clearer). Reverb before delay in the mix balance (the line smears). Glide on every note (ALWAYS mode: it is a slide whistle); legato only. A gate with nothing on the filter (a buzzer).

### 3.7 PLUCK

**What the ear needs.** A pluck is an envelope [LAW]. Instant attack, a decay of 150 to 400 ms, no sustain, a filter that closes faster than the level, velocity that opens the filter envelope, and a dotted delay that turns one note into a rhythm. It must sound within 20 ms of note-on [LAW]. [WHY] a plucked string loses its high partials in the first 100 ms and its energy over the next 300: the filter envelope shorter than the amp envelope is that physics.

**The data says** [DATA]: SW plucks: 84 % have a filter envelope (the highest share of any kind), amount 0.55 of travel, decay 152 ms (79 to 315) against an amp decay of 216 ms (filter 0.73x the amp's); HW plucks: filter envelope 5.2 octaves, decay 57 ms against amp decay 83 ms, velocity used in 69 % (the highest of any HW kind), to the amp 78 % and the filter envelope amount 67 %; LFO to pitch in 90 % of HW plucks at 3.06 Hz (a pitch blip on the attack); delay on 85 %, reverb 81 %; held time in the branded MIDI 0.25 beats (a 1/16 at any tempo), never over a beat. Among the branded presets, the reverb mix (51 %) and the delay mix (36 %) are the top macros.

**Engine and roles** [LAW]:

- **The pluck:** one slot, ANALOG SAW VOICES 3 DETUNE 0.1 (a little width, not a stack), or FIRESAW SAWS 7 MIX 0.6 for the trance pluck, or FIRETINE STAGE DAMPER 0.8 (short) for the struck tine, or FM (a marimba or kalimba program) for the mallet, or FIREBLOOM BITS 0.6 EDGE high FADE short for the glassy one. No detune beyond 0.15, no unison beyond 3 [LAW].
- **The sub:** SUB SINE -1 oct -12 dB (SUB is in 62 % of arp patches and most plucks) [DATA, LAW].
- **The click (optional):** ANALOG SQUARE +12 st -9 dB, SWELL 0 / 120 ms / 0 / 80 ms; or NOISE WHITE BAND 0.8 -24 dB SWELL 0 / 15 ms / 0 / 10 ms: the pick on the string.

**Filter.** LP 24 dB (SVF or SUPER), cutoff 0.2 to 0.35 (low: the envelope opens it), resonance 0.2 to 0.35 (the ping: HW pluck resonance is the most varied pluck control, spread 0.53), KT 100 % [DATA, LAW]. GLOW amount +0.4 to +0.7, VEL 50 to 80 %.

**Envelopes** [DATA]:

| stage | HW pluck (328) | SW pluck (688) | start from |
|---|---|---|---|
| SWELL attack | 1 ms (1 to 2) | 2 ms (1 to 5) | 0 to 1 ms |
| SWELL decay | 83 ms (14 to 364) | 216 ms (75 to 592) | 300 ms, EXP 2 |
| SWELL sustain | 0.075 (0 to 0.62) | 0.29 (0 to 1.0) | 0 |
| SWELL release | 39 ms (7 to 99) | 113 ms (26 to 305) | 100 ms |
| GLOW amount | 5.2 oct (3.1 to 7.7), on 81 % | 0.55 (0.37 to 0.81), on 84 % | +0.6, VEL 70 % |
| GLOW attack | 1 ms | 1 ms (1 to 4) | 0 |
| GLOW decay | 57 ms (14 to 243) | 152 ms (79 to 315) | 150 ms (half the amp's) |
| GLOW sustain | 0.006 (0 to 0.14) | 0 (0 to 0.18) | 0 |
| GLOW release | 220 ms | 220 ms (37 to 723) | 100 ms |

The amp sustain is the most varied SW pluck control (spread 0.58): plucks range from pure (sustain 0) to pluck-into-pad (sustain 0.3 to 0.5 with a slow filter). Both are plucks if the filter envelope does its job.

**Movement.** A pitch blip: HW plucks route an LFO to pitch in 90 % at 3.06 Hz but the branded ones send an envelope or a short LFO to pitch at 0.05 of travel: a few cents up at the attack, gone in 50 ms [DATA]. Osc mix stepped at 1/4 (16 % of branded plucks) for a rhythmic pluck [DATA]. Autopan 0.4 Hz (25 % HW) [DATA]. Over 8 s the delay is the movement; the engine needs only the blip.

**Playing.** Velocity to the filter envelope amount 50 to 80 % and to the amp 30 to 50 % [LAW, DATA]: soft is a dull thud, hard is a bright pluck. The wheel: the cutoff (85 % of SW pluck wheel routes) or the delay mix [DATA]. Aftertouch rarely (1 %). Key tracking 100 %: a pluck must sound the same up the keyboard or the arp will not.

**Effects** [DATA, LAW]: delay is the pluck's effect: 1/8 dotted at 0.25 to 0.40, feedback 0.5, filtered in the loop (HP 300, LP 5 k), ducked -24 dB over 300 ms so the dry note stays in front; on 85 %. Reverb plate, pre-delay 20 ms (SW 43 ms), decay 2 s (SW 3.5 s), mix 0.28 to 0.38, on 81 %. Chorus 0.24 in 39 % (4 voices, 0.6 Hz). Distortion in 38 % at mix 0.5, drive 0.27: a little grit on the attack. Compressor on 57 %: the makers glue the delay to the dry.

**Identity and imperfection.** The envelope itself (Glass Pluck) or the tine's inharmonic ding (Tine Pluck). The imperfection: the delay saturating, or a pitch blip slightly too large on hard hits.

**Starting recipes** [LAW]

- **"Glass Pluck"**: ANALOG SAW VOICES 3 DETUNE 0.1, SVF LP 24 cutoff 0.2 reso 0.2 KT 100 %, GLOW 0 / 150 ms / 0 / 100 ms +0.6 VEL 70 %, SWELL 0 / 300 ms / 0 / 100 ms; SUB SINE -1 oct -12 dB; delay 1/8 dotted 0.27 filtered ducked, reverb plate 0.28 pre 20 ms. Under 20 ms to first sound.
- **"Tine Pluck"**: FIRETINE STAGE DAMPER 0.8 SCATTER 0.3 DRIVE 0.2, SWELL 0 / 400 ms / 0 / 150 ms; ANALOG SQUARE +12 st -9 dB SWELL 0 / 120 ms / 0 / 80 ms (the click); chorus 0.18, delay 1/8 0.25, plate 0.28.
- **"Trance Pluck"**: FIRESAW SAWS 7 MIX 0.6 DETUNE 0.3, LP 24 cutoff 0.3 reso 0.25, GLOW 0 / 180 ms / 0 +0.6 VEL 60 %, SWELL 0 / 250 ms / 0 / 80 ms; SUB SINE -12 dB; delay 1/8 dotted 0.35 ping-pong, plate 0.35 3 s, distortion 0.3 mix 0.4.
- **"Kalimba"**: FM mallet program BRIGHT 0.9 velocity to BRIGHT +0.5, SWELL 0 / 600 ms / 0 / 200 ms, no filter envelope (FM is the brightness), NOISE click -24 dB 10 ms; room 0.25, delay 1/4 triplet 0.2.
- Variants: "Pluck Pad" (sustain 0.4, GLOW decay 1 s: a pluck that stays), "Guitar" (ANALOG SAW-TRI SHAPE 0.4, BP cutoff 0.5 width 0.3, GLOW decay 60 ms +0.3, SWELL decay 1.5 s sustain 0, a 3 ms "second string" slot detuned 8 cents).

**Mistakes.** Filter envelope longer than the amp's (then it is a stab or a swell, not a pluck). Sustain above 0.3 without a reason. Delay on the same subdivision as the arp that will play it (the echo lands on the next note: use 1/8 dotted under a 1/16 arp [LAW]). Delay loop unfiltered (mud after four repeats). Attack over 5 ms (the pluck is gone). A unison stack (a pluck is one string).

### 3.8 BASS

**What the ear needs.** Weight that is mono and clean under 120 Hz, a body above it with a character (saw bark, square hollow, reese beat, FM growl), an attack that lands with the kick (under 5 ms; a knock), a filter that opens on velocity and closes within the note, a release short enough that notes never overlap (18 to 31 ms), and drive after the filter. The sub never moves, never chorused, never reverbed; the body does everything. [WHY] under 120 Hz the ear cannot place a sound in stereo and any pitch wobble reads as out of tune, so every bass rule is a rule about keeping the low octave still.

**The data says** [DATA]: 1,610 SW basses and 686 HW: amp attack 1 to 2 ms, release 18 ms HW / 31 ms SW, the shortest of any kind; filter envelope on 62 % HW (4.6 octaves, decay 122 ms, sustain 0.06) and 75 % SW (0.57 of travel, decay 214 ms); velocity to the cutoff as much as the amp (SW 53 % cutoff, 32 % amp); the mod wheel in 47 % of SW basses to the cutoff (74 %); distortion on 50 % at drive 0.29 mix 0.88; LFO to osc mix synced at 1/4 in 57 of 73 branded bass routes (the wobble); reverb on only 37 % at mix 0.25 with the low cut at 81 Hz. Glide: Tabula's old basses glided 97 %, the research says 0 to 19 % per kind: glide is off by default [LAW L105]. Bass was the hardest kind for the author's ear: 22 % liked; mono, glide and unison were the traits of the disliked ones [EAR].

**Engine and roles** [LAW]:

- **FIREBASS** is the bass engine: BODY (SAW for the modern fat bass, SQUARE for the hollow, REESE, FM, GROWL, KNOCK, ROLLER for psy, DEEP for the sub bass, TWIN FOOTAGES for the organ bass), SUB 0.5 to 0.7 (SINE, -1 oct), SHAPE 0, TONE 0.75, PUNCH 0.2 (the knock: 12 x PUNCH semitones falling in 3 ms), TIGHT 0 (held) to 0.7 (rolling psy notes), GLIDE 0 to 40 ms LEGATO, PHASE 0 (lined up with the kick), DRIVE 0.3 on the body only, ROOM 30 to 60 Hz when a kick is under it, 0 for a deep sub. The body and the sub are phase-locked so they never cancel: this is why one FIREBASS slot beats a saw plus a SUB slot.
- **ANALOG bass** (the Moog / SH-101 card): ANALOG SAW and SQUARE 40/60 in two slots, 3 cents apart, SUB SINE -1 oct -6 dB in a third, LP 24 (SUPER) cutoff 0.2 to 0.35, resonance 0.15 to 0.3, GLOW +0.4 to +0.6 decay 150 to 300 ms sustain 0.2 to 0.3, drive after the filter [LAW].
- **Reese:** FIRESAW SAWS 14 SPLIT 2 DETUNE 0.15 MIX 0.5 GROUP DRIFT 0.4, SPREAD only above 150 Hz; or two ANALOG SAW slots 12 to 20 cents apart; LP 24 cutoff 0.35; played an octave lower than you think; no sub in the reese itself, a SUB SINE slot -6 dB under it (the reese has no floor of its own) [LAW].
- **Acid (303):** one ANALOG SAW or SQUARE, SSM-type corner (SVF or CASCADE), resonance 0.6 to 0.8, GLOW decay 200 ms sustain 0, +0.4, accent = velocity over 100 adds +0.3 to the envelope amount, slide = legato glide 60 ms; the sequence is the sound [LAW]. HW acid: filter envelope on 80 %, its release 5.15x the amp's (the filter keeps closing after the note), velocity to the filter in 46 %, the wheel in 29 % (the most of any HW kind) to the cutoff [DATA]. SW acid: distortion on 74 % at drive 0.38, filter envelope only 0.22 of travel but resonance high [DATA].
- **Sub bass:** SUB SINE or FIREBASS DEEP, SUB 1.0, body TONE 0.3, no filter, SWELL 2 ms / 0 / 1.0 / 30 ms, a 3 ms PUNCH knock so the note has a front. Sub was the author's best-liked kind (67 %) [EAR]: it is the easiest to get right because there is nothing to get wrong above 120 Hz.
- **FM bass:** FM bass program BRIGHT 0.6 with velocity to BRIGHT +0.5, FEEDBACK 0.3 to 0.6 for growl; SUB SINE -1 oct under it; LP 24 at 0.5 to tame the top.
- **Modern discipline** [LAW]: under 100 Hz mono, under 40 Hz gone, sidechain in the preset when the category says so, loud because dense.

**Filter.** LP 24 dB (SUPER): the steep slope is what makes a bass sound closed rather than dull. Cutoff 0.2 to 0.35, resonance 0.15 to 0.3 (0.6+ only for acid), KT 50 % (a bass filter tracking 100 % opens too much on the high notes of a line and loses the weight). GLOW +0.4 to +0.6 with VEL 60 %. BURN LP for a driven bass (HEAT up, SCREAM low). The cutoff is modulated in 89 % of SW basses, 67 % of HW [DATA].

**Envelopes** [DATA]:

| stage | HW bass (686) | SW bass (1610) | start from (fat) | acid | sub |
|---|---|---|---|---|---|
| SWELL attack | 1 ms (1 to 2) | 2 ms (1 to 6) | 1 ms | 1 ms | 2 ms |
| SWELL decay | 227 ms (36 ms to 1.2 s) | 272 ms (0 to 845) | 576 ms | 462 ms | 0 |
| SWELL sustain | 0.65 (0.04 to 1.0) | 1.0 (0.41 to 1.0) | 0.9 | 0.4 | 1.0 |
| SWELL release | 18 ms (5 to 64) | 31 ms (13 to 90) | 70 ms | 25 ms | 30 ms |
| GLOW amount | 4.6 oct (3.0 to 6.4), on 62 % | 0.57 (0.39 to 0.81), on 75 % | +0.5, VEL 60 % | +0.4, accent +0.3 | none |
| GLOW attack | 1 ms | 1 ms | 1 ms | 1 ms | - |
| GLOW decay | 122 ms (30 to 372) | 214 ms (104 to 472) | 250 ms | 200 ms | - |
| GLOW sustain | 0.055 (0 to 0.28) | 0.023 (0 to 0.25) | 0.25 | 0 | - |
| GLOW release | 51 ms | 78 ms | 100 ms | 1.3 s (HW acid median) | - |

The amp sustain is the most varied HW bass control (spread 0.60): basses run from a gate (42 % SW: the note holds until the next) to a pluck (13 to 20 %) [DATA]. The filter decay is 0.61x the amp's in HW basses (shorter in 54 %): the bark goes before the weight. Release: never over 90 ms on a bass that plays 1/16s or the notes smear into each other.

**Movement.** The wobble: an LFO synced to 1/4 (or 1/8, 1/16 under the wheel) on the cutoff, square/step or triangle, depth 0.3 to 0.7, on 15 % of branded basses (osc mix) and 6 % (cutoff) [DATA]; the wheel sets its depth or its rate. PWM at 1 Hz on a square bass (33 % HW) [DATA]. A pitch blip (FIREBASS PUNCH or BEND) at the attack: 37 % of HW basses modulate pitch, mostly envelope blips and vibrato at 3.06 Hz [DATA]. Over 8 s a bass does not need to move; the line moves. Nothing on the sub, ever.

**Playing.** Velocity to the cutoff (SW 53 %, HW: amp 39 %, filter env amount 30 %, cutoff 25 %) [DATA]: a hard note barks, a soft note is round, both the same weight (the sub at VELOCITY 0 to 30 %). The wheel: the cutoff +0.2 (74 % of SW bass wheel routes), or the wobble depth [DATA, LAW]. Aftertouch: cutoff +15 % (63 % of HW bass aftertouch routes) [DATA, LAW]. Mono legato; glide only on the acid and the 808 slide (LEGATO mode, 30 to 60 ms).

**Effects** [DATA, LAW]: distortion after the filter 0.5 (the data's bass median: drive 0.29, mix 0.88, on 50 %), on the body only. Compressor light (on 50 %). EQ on 70 %: a dip at 250 to 400 Hz if the body and the kick fight. No chorus under 150 Hz; a chorus 0.18 on the body above 150 Hz only (25 % of SW basses). No reverb on the low end; a send with low-cut 300 Hz at most 0.1 (SW bass reverb: on 37 %, mix 0.25, low cut 81 Hz) [DATA]. Delay rarely (29 %), 1/8 at 0.2 with low cut 200 Hz. Sidechain to the kick in the preset for house and techno.

**Identity and imperfection.** The sub under a saw that barks on velocity (Floor Bass); two saw groups beating (Wide Reese); the ladder drive (Moog bass); the squelch and slide (303). The imperfection: the drive just past clean, or a PUNCH knock slightly too hard.

**Starting recipes** [LAW]

- **"Floor Bass"**: FIREBASS BODY SAW, SUB SINE -1 oct 0.6, GLIDE LEGATO 0, DRIVE 0.3, PUNCH 0.2, ROOM 40 Hz; SUPER LP 24 cutoff 0.28 reso 0.2 KT 50 %, GLOW 1 ms / 250 ms / 0.25 / 100 ms +0.5 VEL 60 %, SWELL 1 ms / 576 ms / 0.9 / 70 ms; mono legato; wheel opens cutoff +0.2; distortion after the filter 0.5, compressor light, no chorus, reverb send low cut 300 Hz at 0.1 at most.
- **"Wide Reese"**: FIRESAW SAWS 14 SPLIT 2 DETUNE 0.15 MIX 0.5 GROUP DRIFT 0.4 SPREAD 0.3 above 150 Hz, SUPER LP 24 cutoff 0.35 reso 0.15, GLOW +0.2, an octave lower than you think; SUB SINE -1 oct -6 dB mono no filter; distortion 0.57 on the reese only, fx filter, compressor 0.12.
- **"Moog Bass"** (the card): ANALOG SAW and SQUARE 40/60 3 cents apart, SUB SINE -6 dB, SUPER LP 24 cutoff 0.25 reso 0.25, GLOW +0.5 decay 200 ms sustain 0.25 VEL 60 %, SWELL 1 ms / 400 ms / 0.8 / 40 ms, HEAT POST 0.4 (the ladder drive: after the filter), mono legato, aftertouch to cutoff +0.15.
- **"Acid Line"**: ANALOG SAW, SVF LP 24 cutoff 0.25 reso 0.7 KT 60 %, GLOW 0 / 200 ms / 0 / 1 s +0.4, accent (v over 100) +0.3 to the amount, SWELL 1 ms / 462 ms / 0.4 / 25 ms, legato glide 60 ms, wheel to cutoff, distortion 0.4 mix 1.0, delay 1/8 dotted 0.2 filtered; ships with a SEQ in C with 2+ accents and 1 slide per bar.
- **"Deep Sub"**: FIREBASS BODY DEEP, SUB 1.0 SINE -1 oct, TONE 0.3, PUNCH 0.15, ROOM 0, no filter, SWELL 2 ms / 0 / 1.0 / 30 ms, VELOCITY 20 %. Nothing else. Mono.
- **"Growl"**: FM bass program BRIGHT 0.7 FEEDBACK 0.5 velocity to BRIGHT +0.5, LP 24 cutoff 0.5 GLOW +0.3 decay 150 ms; SUB SINE -1 oct -6 dB; distortion 0.4; an LFO 1/4 synced on BRIGHT depth 0.3 under the wheel.

**Mistakes.** Stereo under 120 Hz (chorus, unison, a wide reverb on the sub: the mix falls apart on a club system). Release over 100 ms on a fast line. Glide ALWAYS (every note slides: a siren). Reverb on the sub. A saw plus a SUB slot that are not phase-aligned (use FIREBASS, or PHASE RESET on both). Velocity to volume only (the weight must stay, the bark must change). Resonance over 0.3 on anything but acid (the fundamental thins). Playing it an octave too high (reese) or too low (a saw bass under 40 Hz is a rumble).

### 3.9 BRASS

**What the ear needs.** A swell on every note: the filter opens over 30 to 60 ms after the level has arrived, so the note goes from dark to bright as a trumpet does when the player's air catches up; a sustain around 0.6, not full; a section of two detuned saws; a delayed vibrato at 4 to 5 Hz; velocity that makes a hard note much brighter (the blat); and a short release. [WHY] a brass instrument's spectrum opens with blowing pressure; the filter envelope with a slow attack is that pressure rising.

**The data says** [DATA]: 120 HW brass: sustained 73 % (only wind is higher), amp attack 6 ms (2 to 24), sustain 0.63, release 25 ms; filter envelope on 78 % at 4.9 octaves with attack 8 ms (2 to 46), decay 301 ms, sustain 0.40; the filter attack spread (0.41) and amp attack (0.39) are the most varied brass controls: the swell is where brass patches differ; detune is the most varied oscillator control (0.45) and chorus is on 66 %; velocity used in 41 %, to the amp 80 % and the cutoff 43 %; LFO to pitch in 50 % at 4.24 Hz.

**Engine and roles.**

- **The section:** two ANALOG SAW slots, VOICES 2 DETUNE 0.15 each, the two slots +/-5 cents (OB-Xa brass: DOUBLE through the same engine is the card [LAW]); or FIRESAW SAWS 7 MIX 0.6 for a synth brass stab. A PULSE WIDTH 0.3 slot at -6 dB adds the reed of a sax or a horn.
- **The breath:** NOISE PINK BAND 0.6 WIDTH 0.3 -30 dB, SWELL 30 ms / 300 ms / 0.1 / 100 ms: the air at the attack.
- **Octave:** for a big section a third SAW slot -12 st at -9 dB (the trombones). No sub.

**Filter.** LP 24 dB (SUPER) for the classic synth brass, cutoff 0.3 (closed: the envelope opens it), resonance 0.1 to 0.2, KT 70 %. GLOW +0.45, VEL 60 %, attack 40 to 60 ms. The HW brass filter envelope is on in 78 % at 4.9 octaves [DATA].

**Envelopes** [DATA]:

| stage | HW brass (120) | start from (section) | stab |
|---|---|---|---|
| SWELL attack | 6 ms (2 to 24) | 30 ms | 0 |
| SWELL decay | 430 ms (86 ms to 1.3 s) | 500 ms | 374 ms |
| SWELL sustain | 0.63 (0.33 to 0.85) | 0.9 | 0.3 |
| SWELL release | 25 ms (11 to 80) | 250 ms | 60 ms |
| GLOW amount | 4.9 oct (3.6 to 6.3), on 78 % | +0.45, VEL 60 % | +0.5 |
| GLOW attack | 8 ms (2 to 46) | 60 ms (the swell) | 0 |
| GLOW decay | 301 ms (82 ms to 1.3 s) | 400 ms | 374 ms |
| GLOW sustain | 0.40 (0.23 to 0.63) | 0.5 | 0 |
| GLOW release | 34 ms | 250 ms | 11 ms |

The filter and amp decays ride together (1.0x) in brass, unlike plucks; the filter's attack is what is longer.

**Movement.** Delayed vibrato at 4.2 to 4.8 Hz (HW 4.24 Hz, 4.0 to 5.3), 300 to 500 ms in, depth +/-10 cents, in 50 % of HW brass [DATA]. PWM at 0.71 Hz on the pulse slot (35 %) [DATA]. The chorus / ensemble is the 8 s movement.

**Playing.** Velocity to the amp (80 %) and the cutoff or the filter envelope amount (43 % / 18 %) [DATA]: the blat. The wheel: opens the cutoff (the swell by hand) or the vibrato. Aftertouch: the swell or the cutoff (HW brass aftertouch goes to the amp 83 % and the cutoff 67 %: the CS-80 way) [DATA, LAW]. Poly, no glide; a solo horn is mono legato with glide 30 ms.

**Effects** [DATA, LAW]: chorus 0.18 to 0.25 (on 66 % of HW brass; SW 0.18), reverb hall, pre-delay 30 ms, decay 2 to 2.5 s, mix 0.25 (SW 0.35), low cut 200 Hz; delay rarely (1/8 at 0.17 on a stab); HEAT PRE 0.1 to 0.2 for the valve edge; no distortion on a section.

**Identity and imperfection.** The filter's swell on every note (Bright Brass); the data's stab times (Stab Brass). The imperfection: the two slots' detune slightly uneven, or one slot's swell 10 ms behind the other.

**Starting recipes** [LAW]

- **"Bright Brass"**: two ANALOG SAW VOICES 2 DETUNE 0.15, +/-5 cents, LP 24 cutoff 0.3 KT 70 %, GLOW 60 ms / 400 ms / 0.5 / 250 ms +0.45 VEL 60 %, SWELL 30 ms / 500 ms / 0.9 / 250 ms; NOISE breath -30 dB; wheel opens cutoff; vibrato 4.5 Hz delayed 400 ms on aftertouch; reverb hall 0.25.
- **"Stab Brass"**: FIRESAW SAWS 7 MIX 0.6, LP 24 cutoff 0.35, GLOW 0 / 374 ms / 0 / 11 ms +0.5, SWELL 0 / 374 ms / 0.3 / 60 ms (the data's stab times); chorus 0.25, delay 1/8 0.17, reverb 0.26.
- **"OB Brass"** (the card): one ANALOG SAW VOICES 2, DOUBLE on (an octave up through the same engine), LP 12 cutoff 0.4 reso 0.15, GLOW 40 ms / 350 ms / 0.5 +0.4, SWELL 20 ms / 400 ms / 0.8 / 200 ms, chorus 0.3, aftertouch to cutoff +0.2.
- Variants: "Horn" (one SAW plus PULSE 0.3, mono legato glide 30 ms, cutoff 0.35, vibrato on the wheel 5 Hz: a solo French horn), "Sax" (PULSE WIDTH 0.25 plus NOISE breath -22 dB, BP cutoff 0.5 width 0.4 KT 100 %, GLOW attack 80 ms +0.4, vibrato 5.5 Hz delayed 500 ms, growl: an LFO 30 Hz on pitch depth 0.05 under aftertouch).

**Mistakes.** Filter attack 0 (then it is a stab or a lead, not brass). Sustain 1.0 (a brass note settles after the attack). Vibrato immediate (the swell and the vibrato together read as a wobble). No velocity to brightness (the blat is the instrument). LP 12 on a section (too bright; the 24 keeps it dark until the swell).

### 3.10 BELL

**What the ear needs.** A strike and a ring: an instant attack with a bright, inharmonic burst (partials at non-integer ratios: 1, 2.0, 2.4, 3.0, 4.5, 5.3 is a church bell; 1, 2.76, 5.4 a tubular bell), a long decay (1 to 3 s held) that is also the release (a bell does not stop when the key is let go), the high partials dying first, velocity to the strike's brightness, and a chorus or detune so the partials beat. [WHY] a saw's partials are all integer multiples, so no filter can make a bell from it; only FM, ring modulation, sync or a bit-shaped wave gives the inharmonic set. This is the one category where the engine choice is not optional.

**The data says** [DATA]: 114 HW bells: pluck shape 47 %, decaying 11 %, long tail 7 %; amp decay 363 ms (86 ms to 1.0 s), sustain 0, release 306 ms (86 ms to 1.1 s), the longest HW release of the struck kinds; filter envelope on 67 % at 4.4 octaves with decay 128 ms (0.54x the amp's: the brightness goes first); velocity used in 45 % HW, 87 % SW, to the amp 80 to 100 % and the cutoff 43 %; LFO to pitch in 54 % at 4.47 Hz; chorus on 68 % HW, phaser 60 %; SW bells: release 901 ms, reverb decay 6.8 s (the longest reverb of any kind), delay on 77 % at mix 1.0 (a doubling), amp envelope attack 11 ms and sustain 0.5 on the Serum default (do not copy that).

**Engine and roles.**

- **FM:** a bell program (the DX7 tubular bell: carrier 1.0, modulator 3.5 with a fast-decaying index), BRIGHT 0.8 to 1.2, FEEDBACK 0.2 to 0.4, velocity to BRIGHT +0.5 (the harder the strike the more sidebands). The strike is the modulator's envelope; the FM program carries it.
- **FIREBLOOM:** BITS 0.6, EDGE high, FADE short, STRIKE 0.5 with STRIKE RATIO 14 (the glassy tine) or 5.4 (the tubular bell), STRIKE TIME 0.07 s, STRIKE CLICK 0.25: the bit-shaped wave gives the partials, STRIKE the burst. A second slot ANALOG SINE +24 st -12 dB with SWELL 0 / 300 ms / 0 / 300 ms is the hammer's ping.
- **Analogue bell (the PPG card):** two ANALOG SINE or TRI slots at a non-octave interval (+19 st and +31 st, or one at +5 st and one at +14), ring or a hard SYNC (FIREBLOOM SYNC) with GLOW on the sync pitch falling over 200 ms (the table sweep on the attack [LAW]), plus the fundamental slot.
- **Glass / mallet:** FM glockenspiel or marimba program, BRIGHT 0.9, decay shorter (600 ms to 1.2 s); NOISE click.

**Filter.** Open or LP 12 at 0.8 with GLOW +0.3 decay 150 ms as the strike's extra brightness; KT 100 %. On FM the filter is not the brightness (BRIGHT is); on FIREBLOOM EDGE and STRIKE are. The cutoff still tracks (67 % of HW bells have a filter envelope).

**Envelopes** [DATA]:

| stage | HW bell (114) | SW bell (53) | start from |
|---|---|---|---|
| SWELL attack | 1 ms (1 to 3) | 11 ms (default-dominated) | 0 to 1 ms |
| SWELL decay | 363 ms (86 ms to 1.0 s) | 542 ms (216 ms to 1.2 s) | 2.5 s, EXP 2 |
| SWELL sustain | 0.002 (0 to 0.5) | 0.5 (default) | 0 |
| SWELL release | 306 ms (86 ms to 1.1 s) | 901 ms (642 ms to 1.2 s) | 2.5 s (the ring continues) |
| GLOW amount | 4.4 oct (3.0 to 6.0), on 67 % | 0.33 (0.20 to 0.40) | +0.3 (or BRIGHT / STRIKE) |
| GLOW decay | 128 ms (9 to 863) | 257 ms (198 to 668) | 150 ms (the strike) |
| GLOW sustain | 0.04 (0 to 0.54) | 0 | 0 |
| GLOW release | 352 ms | 561 ms | 300 ms |

The HW amp decay (363 ms) is short because many HW "bells" are DX e-piano and glock patches; a tubular bell is 2 to 4 s. The release equal to the decay is the law: the ring must not depend on how long the key is held.

**Movement.** The partials beating: two slots 5 to 8 cents apart, or FIREBLOOM SPREAD 0.2, or a chorus 0.3. LFO to pitch at 4.47 Hz (3.1 to 4.8) in 54 % of HW bells: a slow shimmer of +/-3 cents, not a vibrato [DATA]. Autopan at 2.5 to 2.9 Hz on 10 % HW, 46 % SW [DATA]. Over 8 s a bell is still ringing; it needs nothing more.

**Playing.** Velocity to the amp (80 % HW, 100 % SW) and to the strike's brightness (cutoff 43 %, BRIGHT, STRIKE) [DATA]: a soft bell is a round hum, a hard bell is glass. Velocity is used in 87 % of SW bells, the most of any SW kind. The wheel: the chorus depth or the decay (SWELL decay +50 %). Aftertouch: used in 21 % of SW bells, to LFO rate and pitch (a shimmer under pressure) [DATA]. Key tracking: the decay should shorten up the keyboard (halve every 18 semitones, as FIREKEYS does); a row or key-to-decay assign -30 %.

**Effects** [DATA, LAW]: reverb hall or big, pre-delay 0 to 20 ms (SW bells 0 ms: the strike and the room arrive together), decay 4 to 7 s (SW 6.8 s), mix 0.4 (SW 0.43), low cut 90 to 150 Hz, width 0.6 (SW 0.58: bells are narrower than pads). Delay 1/4 dotted at 0.25, feedback 0.28, or a doubling (SW bells: delay on 77 % at mix 1.0) [DATA]. Chorus 0.34 (on 45 % SW, 68 % HW) or a phaser 0.33 (60 % HW: the DX bell through a phaser) [DATA]. No distortion (4 %), no compressor.

**Identity and imperfection.** The inharmonic strike (FM) or FIREBLOOM's STRIKE at ratio 14. The imperfection: two partials beating slowly, or the hammer ping a touch louder on the top octave.

**Starting recipes** [LAW]

- **"Crystal Bell"**: FM bell program BRIGHT 0.8 FEEDBACK 0.3, velocity to BRIGHT +0.5, SWELL 0 / 2.5 s / 0 / 2.5 s EXP 2; filter open KT 100 %; reverb hall 0.4 5 s pre 10 ms low cut 120 Hz width 0.6, delay 1/4 dotted 0.25.
- **"Bloom Bell"**: FIREBLOOM BITS 0.6 EDGE 0.8 FADE 0.5 STRIKE 0.5 RATIO 14 TIME 0.07 CLICK 0.25 SPREAD 0.2, SWELL 0 / 2 s / 0 / 2 s; ANALOG SINE +24 st -12 dB SWELL 0 / 300 ms / 0 / 300 ms (the strike); chorus 0.3, hall 0.4 5 s.
- **"PPG Bell"** (the card): FIREBLOOM SYNC 0.7 with GLOW on SYNC +0.6 decay 200 ms sustain 0, BITS 0.4 EDGE 0.9; ANALOG TRI +19 st -9 dB; SWELL 0 / 1.8 s / 0 / 1.8 s; chorus 0.3, plate 0.35.
- **"Glock"**: FM glockenspiel program BRIGHT 1.0, SWELL 0 / 900 ms / 0 / 900 ms, NOISE WHITE click -24 dB 8 ms, room 0.3 pre 0, delay 1/8 0.15. Velocity to BRIGHT +0.6.
- **"Tubular"**: FM tubular program BRIGHT 0.9, SWELL 0 / 4 s / 0 / 4 s, decay shortening up the keyboard -30 %, big reverb 7 s 0.45.

**Mistakes.** A saw or a pulse as the bell's body (harmonic: it is an organ with a decay). Sustain above 0 (a bell cannot hold). Release shorter than the decay (the ring is cut when the key lifts). A vibrato (bells shimmer, they do not sing). Pre-delay 40 ms (the strike separates from the room and sounds like two events). Serum's default envelope (11 ms attack, sustain 0.5) left in: 34 % of SW bells have it and it is not a bell.

### 3.11 ARP

**What the ear needs.** The preset is the pattern [LAW]: a short pluck or stab that the arpeggiator plays at 1/16, with a gate of about two thirds of a step, an accent map that is not flat, a filter that sweeps over 2 or 4 bars, and a delay on a different subdivision than the arp so the echoes rotate the pattern instead of landing on the next note. The sound alone is a pluck (3.7); the arp settings make the category. [WHY] at 1/16 and 140 BPM a step is 107 ms, so a 300 ms decay already overlaps the next note; the arp sound is shorter than a played pluck.

**The data says** [DATA]: 345 HW arps and 227 SW: pluck shape 48 % HW / 32 % SW; amp decay 35 ms HW (8 to 222) / 277 ms SW, sustain 0.0075 HW / 0.41 SW, release 26 / 45 ms; filter envelope on 68 % HW at 4.6 octaves with decay 27 ms (11 to 105), SW 0.62 of travel (the deepest SW filter envelope of any kind) with decay 173 ms; velocity to the filter envelope amount in 82 % of HW arp velocity routes (the accent); LFO to cutoff in 53 % HW at 0.55 Hz (a 2-bar sweep at 130 BPM is 0.27 Hz), synced in 38 % HW and 83 % of branded arp cutoff routes; delay on 80 % HW / 85 % SW, reverb 85 % SW at mix 0.37 decay 7.3 s (long: the tail is the pad under the arp); the arp itself steps at 1/16 in 64 to 76 % with gate 0.66 of a step, almost no rests, walks up and down (35 %) more than up (18 %), 1 to 2 octaves, tempo 130 (120 to 160); SUB is in 62 % of arp patches; a distortion in 39 to 44 %. Arp was the author's second best-liked kind (64 %) [EAR].

**Engine and roles.**

- **The arp voice:** ANALOG SAW VOICES 2 DETUNE 0.1, or FIRESAW SAWS 7 MIX 0.6 with GROUP DRIFT gated short (ours), or a FIREBLOOM pluck, or FM mallet. One slot for the note.
- **The sub:** SUB SINE -1 oct -10 dB (62 % of arp patches) [DATA].
- **The second lane (ours):** the same arp a fifth or an octave up at -12 dB with a different gate [LAW]: the two lanes interlock.

**Filter.** LP 24 dB cutoff 0.25 to 0.35, resonance 0.2 to 0.35, KT 100 %; GLOW +0.5 to +0.6 with VEL 60 % (the accent opens it), decay 150 to 300 ms. Then a filter LFO or row synced to 2 or 4 bars, +/-0.15 to 0.25, or the wheel sweeping the cutoff (43 % of SW arps send the wheel to the cutoff) [DATA].

**Envelopes** [DATA]:

| stage | HW arp (345) | SW arp (227) | start from |
|---|---|---|---|
| SWELL attack | 1 ms | 2 ms (1 to 11) | 0 to 1 ms |
| SWELL decay | 35 ms (8 to 222) | 277 ms (74 to 610) | 576 ms with sustain 0 (the gate cuts it) |
| SWELL sustain | 0.0075 (0 to 0.70) | 0.41 (0 to 1.0) | 0 |
| SWELL release | 26 ms (10 to 107) | 45 ms (10 to 159) | 11 ms |
| GLOW amount | 4.6 oct (3.0 to 7.0), on 68 % | 0.62 (0.35 to 0.73), on 77 % | +0.5, VEL 60 % |
| GLOW decay | 27 ms (11 to 105) | 173 ms (80 to 334) | 300 ms |
| GLOW sustain | 0 (0 to 0.085) | 0 (0 to 0.15) | 0 |
| GLOW release | 52 ms | 81 ms | 50 ms |

The HW decays are very short (35 ms amp, 27 ms filter): the Virus and Supernova arp patches are gated by the arp and the envelope is a click; the SW ones are plucks that happen to be arpeggiated. Start between them and let the gate do the cut.

**The pattern** [LAW, DATA]: 8 or 16 steps that resolve; rate 1/16 (1/8 for a slower part); gate 30 to 50 % for plucks, 70 to 90 % for pads-as-arps, never 100 % (the data's 0.66 is a step with a breath); mode up and down or as played; octave range 2 up or down; velocity map never flat: accents on 1 and the "and of 2" at 110 to 127, ghosts at 60 to 80 (HW arp velocity goes to the filter envelope amount in 82 %: the accent is a brightness, not a level); swing 52 to 58 for house and techno, 0 for trance, 62+ hip-hop only; rests and ties make it a clip preset; ships in a key other than C when the step row allows [EAR: the author on the first banks: "every arp and chord preset is in C"].

**Movement.** The filter LFO or row synced to 2 or 4 bars (HW arps: LFO to cutoff 53 % at 0.55 Hz, pw shape 51 % at 0.42 Hz, pan 28 % at 0.24 Hz) [DATA]. BLEND / FIRESAW MIX stepped at 1 bar [LAW]. Autopan slow (0.24 Hz) on the second lane. The delay is the 8 s movement: the echoes land on different steps as the filter opens.

**Playing.** Velocity to the filter envelope amount (82 % HW) and the amp (54 %) [DATA]: the accent map is heard. The wheel: the cutoff (62 % SW) or the delay mix [DATA]. Aftertouch: the cutoff or the LFO depth (8 % SW). Hold / latch is a performance choice; ship it off.

**Effects** [DATA, LAW]: the delay-lock law: the delay on a different subdivision than the arp: 1/16 arp + 1/8 dotted delay at 0.30 to 0.45, feedback 0.4, filtered (HP 300, LP 5 k), L/R heads on different subdivisions rotate the pattern; on 80 to 85 %. Reverb plate or hall, pre-delay 20 ms, decay 3 to 4 s (SW 7.3 s), mix 0.3 to 0.37. Distortion 0.3 at mix 0.66 (on 39 % SW) for a bite. Chorus 0.48 on 34 %. Sidechain the reverb and delay to the dry (duck -24 dB 300 ms) so the pattern stays legible.

**Identity and imperfection.** The pattern and its echo rotation. The imperfection: one ghost note slightly late (swing), or the delay feedback a touch high so the fourth repeat saturates.

**Starting recipes** [LAW]

- **"Arp Pluck"**: ANALOG SAW VOICES 2, LP 24 cutoff 0.3 reso 0.25 KT 100 %, GLOW decay 300 ms +0.5 VEL 60 %, SWELL 0 / 576 ms / 0 / 11 ms; SUB SINE -1 oct -10 dB; distortion 0.6 mix 0.5; delay 1/8 dotted 0.35 filtered ducked; plate 0.3; arp 1/16 up-down 2 oct gate 50 % accents 1 and 2.5, filter row 2 bars +/-0.2.
- **"Drift Stab"**: FIRESAW SAWS 7 MIX 0.6 GROUP DRIFT 0.4, LP 24 cutoff 0.35, GLOW 0 / 200 ms / 0 +0.5, SWELL 0 / 300 ms / 0 / 20 ms; arp 1/8 as played gate 70 %; second lane +7 st -12 dB gate 40 %; delay 1/4 + 1/8 dotted L/R 0.3; hall 0.35.
- Variants: "Pad Arp" (the Juno pad with gate 85 % at 1/8: the pad becomes rhythm), "Acid Arp" (the Acid Line at 1/16 with the wheel on resonance), "Bell Arp" (Glock at 1/16, delay 1/8 triplet: a music box).

**Mistakes.** The delay on the arp's own subdivision (echoes land on notes: mud). Flat velocity (the data's SW arps have it and it is why they sound like a machine). Gate 100 % (the notes merge). Every pattern in C. Decay longer than two steps without a reason (a pad-arp is a choice, not an accident). Reverb mix over 0.4 without ducking (the pattern disappears).

### 3.12 SEQUENCE, STAB and CHORD

These three share one law: the rhythm is the preset and the sound is cut short by the rhythm.

**SEQUENCE** (a bass line or riff the step row plays): a gate shape (62 % SW, 65 % HW sustained with a short release), amp attack 0 to 4 ms, release 67 ms HW / 85 ms SW; filter envelope on only 35 to 40 %, and short (SW decay 108 ms, 0.33x the amp's) because the filter is moved by the step row or a synced LFO instead: LFO to cutoff in 53 % HW at 4.84 Hz (a 1/8 at 145 BPM is 4.8 Hz) and 68 % SW at 1.18 Hz, square/step in 58 % of SW sequence LFOs, 93 % synced [DATA]. The modulation weight by hand (macros, wheel) is the highest of any SW kind (0.90 on the filter, 1.29 on effects): a sequence is a performance patch. Delay on 87 % but at mix 0 median (it is there to be brought in), distortion 48 % at mix 1.0 (drive 0.28), multiband 38 %, bitcrush 7 % (the most of any kind) [DATA]. Recipe: FIREBASS or ANALOG SAW mono, LP 24 cutoff 0.3 reso 0.3, SWELL 1 ms / 1 s / 1.0 / 60 ms, a step row on the cutoff (16 steps, RIDE) and one on the pitch or the osc mix; SEQ in a key with 2+ accents and 1 slide per bar; survives 90 to 140 BPM [LAW]; distortion 0.3; wheel brings the delay in.

**STAB** (a chord hit, 72 SW presets): pluck shape 36 %, attack 0, amp decay 460 ms (260 to 575), sustain 0.29, release 36 ms; filter envelope on 61 % at 0.57 of travel, decay 201 ms, sustain 0.04 (0.58x the amp's); reverb on 99 % (the only kind near 100 %) but at mix 0.18 and a long decay (7.9 s) with no pre-delay and a narrow width (0.33): a wash behind a dry hit; distortion on 88 % at drive 0.24; compressor 65 %, multiband 42 %; LFO to pitch at 7 Hz in 48 % (a fast shimmer), wave morph at 100 Hz (a buzz) [DATA]. The branded stabs put the filter morph on a macro in 25 % and sync in 100 % of the ones that use sync [DATA]. Recipe (Stab Brass, 3.9, is one): FIRESAW SAWS 7 or two ANALOG SAW slots a fifth apart, LP 24 cutoff 0.35, GLOW 0 / 374 ms / 0 / 11 ms +0.5, SWELL 0 / 374 ms / 0.3 / 60 ms; HP 150 Hz on the stack (the kick owns the bottom); distortion 0.25; chorus 0.25; delay 1/8 0.17; reverb 0.26 narrow, long, no pre-delay. The classic rave stab: the hit is a chord voicing (a minor 7th or a sus4) built into the patch with the slots at 0, +3, +7, +10 st.

**CHORD** (a chord voicing in one key, 66 SW / 26 HW): sustained 67 to 68 %; attack 4 to 11 ms, decay 320 to 575 ms, sustain 0.5 to 0.85, release 25 to 82 ms; filter envelope on 73 % SW at 0.44 of travel and inverted in 33 % of HW chords (the filter closes on the attack: the squashed stab) [DATA]; velocity in 77 % of SW chords, the most of any SW kind, to the amp 71 % and the cutoff 59 %; reverb 79 %, delay 85 % at mix 0.6 (the longest delay mix of any kind: the chord is meant to echo), chorus 26 %, phaser 26 % [DATA]. Recipe: three or four slots at the voicing's intervals (0, +4, +7, +11 for a major 7th; 0, +3, +7, +10 minor 7th; 0, +5, +7 sus4), each ANALOG SAW VOICES 2, the top slot -3 dB and the bottom slot a PULSE for definition; each slot its own filter where the voicing needs it (the bottom darker); LP 24 cutoff 0.4, GLOW -0.2 (inverted: closes 150 ms into the note) or +0.3; SWELL 10 ms / 500 ms / 0.7 / 80 ms; velocity to amp and cutoff; delay 1/4 dotted at 0.5 feedback 0.22 filtered; reverb 0.27; chorus 0.38 slow. The step row's CHORD mode is the alternative: one slot, the voicing from the row, in a named key (not C).

**Mistakes (all three).** Everything in C. A sustain that lets the chord bleed into the next hit. A reverb pre-delay on a stab (the hit and the wash separate). A stab without a high-pass (it fights the kick and the bass).

### 3.13 FX and TEXTURE

**What the ear needs.** No note: a movement. A riser is a filter opening over 4 bars; a texture is noise and detuned saws drifting under a long reverb; a hit is a pitch drop and a reverb burst; a drone is a Body with no Air and a 2 s attack. The FX kind is where every border is open (cutoff, pitch, pulse width, wave morph all modulated) and the rates run from 0.07 Hz to 17 Hz [DATA]. [WHY] with no melody to follow, the ear follows whatever moves; a texture that does not move is a hum.

**The data says** [DATA]: 301 HW FX and 184 SW: HW amp sustained 39 %, swell 17 % (2.1x the group), pluck 19 %; SW gate 47 % with 39 % left at the default envelope (the makers shape FX with modulation, not the envelope); filter envelope on 54 % HW at 5.5 octaves (the deepest of any HW kind) with release 300 ms; SW filter decay 1.01 s (0.3 to 4.8 s), 1.79x the amp's; the filter env amount is the most varied HW FX control (0.66); LFO to pitch in 69 % HW, cutoff 51 % at rates 0.076 to 16.2 Hz (10th to 90th), random LFO shapes in 10 % (the most of any kind); SW FX: LFO to cutoff 47 %, wave morph 25 %, osc mix 25 %, square/step in 29 %; reverb on 72 % (mix 0.26, decay 1.4 s for hits; 6 s+ for textures), delay 63 % with time 426 ms (the longest), the delay mix modulated in 26 %; distortion 34 %, bitcrush 3 %, flanger 7 % (the most of any kind); noise oscillators were +7 points among the patches the author liked and "atmosphere" was 53 % liked [EAR].

**Engine and roles.**

- **Texture / atmosphere:** NOISE (PINK, BAND 0.4, WIDTH 1.0, or S&H RATE 0.3 for stepped random tones) in one slot with a 1 to 3 s attack; FIREBLOOM MOTION ALL BITS 0.4 in another; or FIRESAW SAWS 28 SPLIT 4 GROUP DRIFT 0.8 DETUNE 0.6 through a BP (Drift Field). A SUB -2 oct for a floor if the texture is a bed.
- **Riser:** NOISE WHITE plus ANALOG SAW VOICES 8 DETUNE 0.5, HP then LP, a row or envelope on cutoff rising over 4 or 8 bars, pitch rising +12 st over the same, delay feedback rising to 0.8, reverb mix rising; the amp sustained; the release the drop.
- **Hit / impact:** NOISE WHITE BAND 0.3 with SWELL 0 / 600 ms / 0 / 2 s, plus FIREBASS BODY KNOCK PUNCH 1.0 BEND -12 st over 300 ms (the pitch drop), plus a SUB -2 oct; big reverb at 0.5 with no pre-delay; the HW drums pitch drop (72 % of HW drums modulate pitch) [DATA] is the same move.
- **Drone:** a pad Body (3.5) with no Air, cutoff 0.3, attack 2 s, release 4 s, SUB -2 oct, GLOW attack 4 s +0.3; a 0.05 Hz LFO on the cutoff; big reverb 6 to 8 s.
- **Sweep / zap:** ANALOG SAW, LP 24 resonance 0.7, GLOW -1 to +1 over 50 to 500 ms, a pitch envelope -24 st in 100 ms; the HW FX filter envelope at 5.5 octaves is this.
- **Vocal / formant:** two BP filters (TWIN or two slots with their own BP) at vowel pairs (A: 700 and 1200 Hz; E: 400 and 2300; O: 450 and 800; U: 325 and 700), width 0.3, resonance 0.4, a row or LFO moving between them at 0.3 Hz; the source a PULSE 0.4 or FIRESAW; HW vocal: pitch modulated in 82 % at 3.06 Hz (vibrato), amp a gate in 53 % [DATA].

**Filter.** BP for textures and vowels (the one band moving reads as a body); HP + LP for risers (the HP keeps the floor clean while the LP opens); LP 24 with high resonance for zaps. KT off on most FX (the sweep is the point, not the pitch). GLOW amounts large (+0.6 to +1.0) with long times (1 to 5 s); or no envelope and a row.

**Envelopes** [DATA]:

| stage | HW fx (301) | SW fx (184) | texture | riser | hit |
|---|---|---|---|---|---|
| SWELL attack | 2 ms (1 to 49) | 2 ms (0 to 7) | 1 to 3 s | 10 ms | 0 |
| SWELL decay | 184 ms (10 to 715) | 914 ms | 2 s | 0 | 600 ms |
| SWELL sustain | 0.58 (0.03 to 1.0) | 1.0 (0.5 to 1.0) | 0.7 | 1.0 | 0 |
| SWELL release | 107 ms (15 to 531) | 90 ms | 3 to 4 s | 50 ms | 2 s |
| GLOW amount | 5.5 oct (2.4 to 8.0), on 54 % | 0.53 (0.38 to 0.71), on 32 % | +0.3 over 4 s | +1.0 over 8 bars (a row) | -0.6 over 300 ms |
| GLOW attack / decay / release | 4 ms / 169 ms / 300 ms | 7 ms / 1.01 s / 415 ms | 4 s / 4 s / 3 s | - | 0 / 300 ms / 500 ms |

**Movement.** Everything, and at every rate: pitch 69 % HW (3.06 Hz, or a slow drift at 0.3), cutoff 51 % (0.076 to 16 Hz), pulse width 36 %, pan 26 % at 0.35 Hz, random shapes in 10 % [DATA]. Two LFOs at unrelated rates (0.13 Hz and 0.31 Hz) on cutoff and pitch make a texture that never repeats. NOISE S&H RATE for stepped random pitch. FIREBLOOM MOTION ALL and FIRESAW GROUP DRIFT 0.8 move by themselves. A row over 4 bars on the delay feedback. A release sweep fits the kind: the let-go opens the filter or the reverb [LAW].

**Playing.** Velocity to the amp (75 % HW) and the filter env amount (61 %) [DATA]; on a hit, velocity to the pitch drop depth. The wheel: the cutoff (54 % HW, 38 % SW) or LFO depth (59 % SW) [DATA]: a texture's wheel is its rate of change. Aftertouch: anything (the one kind where a 12-semitone pitch bend under aftertouch was found) [DATA].

**Effects** [DATA, LAW]: reverb big, pre-delay 0 (hits) to 60 to 120 ms (textures, the big pre-delay law), decay 6 to 8 s, mix 0.5 to 0.6, low cut 100 to 200 Hz; the reverb-then-filter and filter-after-reverb chain orders are named types here [LAW]. Delay 1/2 at 0.4, feedback 0.5 to 0.8 (a wash; over 0.75 named and filtered), time 426 ms median, the delay mix modulated (26 % SW). Flanger (7 %) and phaser (17 %) at 0.08 Hz. Distortion 0.34 at mix 1.0 on hits; bitcrush on lo-fi textures. A gate (the trance gate: reverb before the gate [LAW]) turns any texture into rhythm.

**Identity and imperfection.** The movement that never repeats (two unrelated LFOs), or FIREBLOOM's MOTION ALL. The imperfection is the kind: random S&H, drift, feedback near runaway at the top of the wheel (and never over it).

**Starting recipes** [LAW]

- **"Ocean Air"**: NOISE PINK BAND 0.4 WIDTH 1, SWELL 1 s / 2 s / 0.7 / 3 s; FIREBLOOM MOTION ALL BITS 0.4 -6 dB; BP cutoff 0.5 width 0.5 with a 0.09 Hz LFO +/-0.15; reverb big 6 s 0.6 pre 80 ms; delay 1/2 0.4.
- **"Drift Field"**: FIRESAW SAWS 28 SPLIT 4 GROUP DRIFT 0.8 DETUNE 0.6, BP cutoff 0.5, SWELL 2 s / 0 / 1 / 4 s; reverb big, delay 1/2 0.4; wheel to BP cutoff.
- **"Riser 8"**: NOISE WHITE plus ANALOG SAW VOICES 8 DETUNE 0.5 +0 st; HP 200 Hz; LP cutoff row 0.2 to 0.9 over 8 bars; pitch row 0 to +12 st over 8 bars; delay 1/8 feedback row 0.3 to 0.8; reverb mix row 0.2 to 0.6; SWELL 10 ms / 0 / 1 / 50 ms. One key, held 8 bars.
- **"Impact"**: NOISE WHITE BAND 0.3 SWELL 0 / 600 ms / 0 / 2 s; FIREBASS KNOCK PUNCH 1.0 BEND -12 over 300 ms SUB 1.0 -2 oct; big reverb 0.5 pre 0 decay 5 s; distortion 0.4.
- **"Vowel Drone"**: FIRESAW SAWS 7 MIX 0.5, two own-filter BP slots (or TWIN) at A and O moving at 0.3 Hz, SWELL 2 s / 0 / 1 / 4 s, SUB -2 oct -9 dB, big reverb 7 s 0.5, vibrato 3 Hz +/-8 cents on the wheel.

**Mistakes.** A texture that sits still (a hum). Reverb low cut off under a texture with a SUB (the bottom becomes a cloud). A riser whose pitch rises but whose filter does not (half a riser). Feedback that runs away at the top of the wheel (the law: no runaway at any wheel position). A hit with pre-delay (two hits).

### 3.14 DRUMS

**What the ear needs.** A pitch drop and a decay: the kick is a sine that falls two octaves in 30 to 80 ms over an amp decay of 200 to 600 ms with a click on top; the snare is noise shaped by a 150 ms decay over a 180 Hz body tone; the hat is filtered noise under 60 ms; the tom a sine drop with a longer decay; the clap three noise bursts 10 ms apart under a 200 ms tail. Nothing sustains; velocity is level and, on the snare, brightness; the drive makes the punch. [WHY] a drum is a struck membrane: its pitch falls as the tension releases and its energy is gone within half a second.

**The data says** [DATA]: 246 HW drums and 211 SW: pluck shape 65 % HW, amp attack 1 ms (1 to 1), decay 76 ms (28 to 279), sustain 0, release 33 ms; filter envelope on 36 % HW at 4.6 octaves with decay 16 ms (0.27x the amp's: the brightness goes at once), inverted in 15 % (the most of any kind: a filter that closes on the hit); pitch is the most modulated destination (44 % HW, 76 % SW), by envelopes and fast LFOs at 3.06 Hz HW / 5.0 Hz SW; noise level is the most varied HW drum control (0.53); velocity to the amp 92 % HW; distortion on 60 % SW at drive 0.33 mix 1.0 (0.91 median), eq 63 %, compressor 32 %, reverb 57 % at decay 7.1 s but mix 0.19 and pre-delay 0; SW drums use the most LFOs of any kind (4.1 per patch), 85 % synced steps: these are drum loops built into a patch, which on our machines is a step-row job, not an LFO job.

**Engine and roles.**

- **Kick:** FIREBASS BODY SINE or DEEP, SUB 1.0, PUNCH 0.8 to 1.0 (12 x PUNCH semitones falling in 3 ms is the click), BEND -24 st over 30 to 60 ms (the drop), TIGHT 0.6, PHASE 0 RESET, DRIVE 0.4; or ANALOG SINE with a pitch row from +24 to 0 st over 50 ms. SWELL 0 / 400 ms / 0 / 50 ms EXP 2. A NOISE WHITE click -18 dB 5 ms for the beater.
- **Snare:** NOISE WHITE BAND 0.6 WIDTH 0.6, SWELL 0 / 150 ms / 0 / 60 ms; a body slot ANALOG TRI at a fixed pitch (KT off, about 180 to 200 Hz) with a 20 st drop in 20 ms, SWELL 0 / 80 ms / 0 / 30 ms, -6 dB against the noise; HP 150 Hz on the noise; velocity to noise brightness (BAND +0.2) and level.
- **Hat:** NOISE WHITE BAND 0.9, HP 6 kHz, SWELL 0 / 60 ms / 0 / 20 ms closed, 0 / 300 ms / 0 / 100 ms open (two patches, or velocity switches the decay); a 0.3 metallic layer: FM with a high-ratio program BRIGHT 1.5 at -12 dB, or six ANALOG SQUARE slots at the 808's fixed ratios (205, 304, 369, 522, 540, 800 Hz) if the machine allows fixed pitch.
- **Tom:** ANALOG SINE or TRI with a 12 st drop over 80 ms, SWELL 0 / 350 ms / 0 / 100 ms, KT 100 % so toms are played across the keys; NOISE click -24 dB.
- **Clap:** NOISE WHITE BAND 0.7, three stabs (a row with three cells 10 ms apart, or three slots with LENGTH short and staggered attacks 0, 10, 20 ms), then a tail SWELL 0 / 200 ms / 0 / 100 ms; BP 1.2 kHz width 0.5; a short plate 0.3.
- **Perc / blip:** FM percussion program, or FIREBLOOM STRIKE 1.0 with FADE 0 and SWELL 0 / 120 ms / 0 / 40 ms.

**Filter.** LP 24 on the kick at 0.35 with GLOW -0.5 decay 20 ms (closes on the hit: the inverted 15 %) or open; HP on noise layers (150 Hz snare, 6 kHz hat); BP on claps and percs. KT off on everything but toms and percs.

**Envelopes** [DATA]:

| stage | HW drums (246) | kick | snare | hat (closed / open) | tom |
|---|---|---|---|---|---|
| SWELL attack | 1 ms | 0 | 0 | 0 | 0 |
| SWELL decay | 76 ms (28 to 279) | 400 ms EXP 2 | 150 ms | 60 / 300 ms | 350 ms |
| SWELL sustain | 0 | 0 | 0 | 0 | 0 |
| SWELL release | 33 ms (12 to 94) | 50 ms | 60 ms | 20 / 100 ms | 100 ms |
| pitch drop | 44 % HW, 76 % SW modulate pitch | -24 st in 30 to 60 ms | -20 st in 20 ms (body) | none | -12 st in 80 ms |
| GLOW | on 36 %, 4.6 oct, decay 16 ms, inverted 15 % | -0.5 in 20 ms or open | +0.3 decay 40 ms on the noise | none | none |

**Movement.** None over time on a single hit; the pitch envelope is the movement. A drum loop is a step-row patch: the row plays the kit's slots (each slot LENGTH short, DRY where the reverb must not touch the kick). A 0.4 Hz LFO on the snare's BAND (HW drums: cutoff 19 %, resonance 7 %) makes a loop breathe.

**Playing.** Velocity to the amp (92 % HW, 78 % of HW drum velocity routes) [DATA] and on the snare and hat to brightness (BAND +0.2, GLOW amount). The wheel: the kick's decay or the snare's noise level (HW drums send the wheel to osc mix 16 %) [DATA]. Key tracking off on kick, snare, hat (the same drum on every key) and on for toms.

**Effects** [DATA, LAW]: distortion 0.33 at mix 1.0 on the kick and snare (on 60 % SW: the punch); EQ (63 %); compressor (32 %) fast; reverb room or plate, pre-delay 0 to 10 ms, decay 0.6 to 1.5 s on the snare and clap at mix 0.2 to 0.3, none on the kick and hat (the SW drum reverb decay of 7.1 s at mix 0.19 is a gated or ducked hall behind a snare; the '80s gated snare is a card: gate keyed from the dry [LAW]); delay rarely (23 %), a 1/16 at 0.1 on a perc; chorus 40 % at 0.03 Hz (a stereo widener on the hat); the stereo tools on 29 %, the most of any kind. The kick DRY: it skips every effect.

**Identity and imperfection.** The pitch drop's speed (fast is techno, slow is 808). The imperfection: the drive just past clean, or a little S&H noise in the hat's BAND so no two hits match.

**Starting recipes**

- **"Deep Kick"**: FIREBASS DEEP SUB 1.0 PUNCH 0.9 BEND -24 st BEND TIME 50 ms TIGHT 0.6 DRIVE 0.4 PHASE 0 RESET ROOM 0; SWELL 0 / 400 ms / 0 / 50 ms EXP 2; NOISE WHITE click -18 dB 5 ms; distortion 0.3; DRY. Velocity to level.
- **"Snap Snare"**: NOISE WHITE BAND 0.6 WIDTH 0.6 HP 150 Hz, SWELL 0 / 150 ms / 0 / 60 ms, GLOW +0.3 decay 40 ms VEL 80 %; ANALOG TRI fixed 190 Hz drop -20 st 20 ms, SWELL 0 / 80 ms / 0 / 30 ms, -6 dB; distortion 0.3; plate 0.25 pre 5 ms 1.2 s.
- **"909 Hat"**: NOISE WHITE BAND 0.9 HP 6 kHz, closed SWELL 0 / 60 ms / 0 / 20 ms, open (velocity over 100) 0 / 300 ms / 0 / 100 ms; FM high-ratio metal -12 dB; chorus 0.2 as a widener; no reverb.
- **"Kit Loop"**: the three above in three slots, LENGTH 30 %, a step row per slot (kick on 1 and 3 with ghosts, snare 2 and 4, hats 1/8 with velocity map), swing 54, the snare's BAND on a 0.4 Hz LFO.

**Mistakes.** Sustain above 0 (a drum does not hold). Reverb on the kick (the low end smears). Key tracking on the kick (a different kick on every key). The pitch drop too slow on a kick (a tom) or absent (a thud). Velocity flat (a machine). A unison stack on noise (nothing: noise is already every frequency).

### 3.15 WIND and VOCAL (the small kinds)

**WIND** (flute, clarinet, oboe, pan pipe; 49 HW): sustained 86 % (the most of any kind), attack 33 ms (10 to 71), sustain 0.66, release 11 ms (7 to 35), the shortest release of any kind (a breath stops); filter envelope on 82 % at 4.1 octaves, attack 7 ms (0.32x the amp's: the brightness is there before the level), sustain 0.62 (held open); vibrato at 4.89 Hz in 61 % (4.4 to 6.0), amp tremolo 5.98 Hz in 32 % (the breath pulsing), velocity used in 53 % to the amp 77 % and the cutoff 27 % [DATA]. Recipe: ANALOG TRI (flute) or PULSE WIDTH 0.5 (clarinet: odd harmonics) or PULSE 0.2 (oboe) in one slot, NOISE PINK BAND 0.7 -20 dB with SWELL 20 ms / 200 ms / 0.3 / 10 ms as the breath (louder on the flute), LP 12 cutoff 0.6 KT 100 % GLOW attack 7 ms +0.3 sustain 0.6 VEL 50 %, SWELL 33 ms / 0 / 0.7 / 11 ms, mono legato glide 15 ms, vibrato 5 Hz delayed 400 ms on the wheel +/-12 cents, tremolo 6 Hz depth 0.1 on aftertouch, room reverb 0.25 pre 15 ms 1.2 s. The overblow: velocity over 110 adds +12 st for 20 ms (a row or BEND).

**VOCAL** (choir, vowel lead, 38 HW): gate 53 % (29 % at the machine's default envelope: the vocal patches are mostly samples on the M1 and D-50 with the envelope left alone), attack 1 ms (1 to 79), sustain 1.0, release 10 ms; filter envelope on only 29 % but with release 1.14 s (16x the amp's: the vowel keeps closing after the note); pitch modulated in 82 % at 3.06 Hz (vibrato), its top destination; velocity 34 % to the amp 77 % and cutoff 46 %; the wheel in 11 % to the cutoff 75 % [DATA]. Recipe (choir): FIRESAW SAWS 14 DETUNE 0.2 MIX 0.4 or ANALOG PULSE 0.4 VOICES 5, two own-filter BP slots or TWIN at the A and O formants (700 and 1200 Hz; 450 and 800) width 0.3 resonance 0.35, a 0.2 Hz LFO moving between them +/-0.1, SWELL 400 ms / 1 s / 1.0 / 1.2 s, vibrato 3.5 Hz delayed 500 ms +/-8 cents, NOISE PINK BAND 0.8 -26 dB as breath, hall reverb pre 40 ms 3.5 s 0.4, chorus 0.3. The vowel lead (3.6 Voodoo-type) is a lead with a BP or TWIN filter and the wheel on the formant.

---

## 4. Quick reference tables

### 4.1 Amp envelope (SWELL) medians per kind

HW / SW medians [DATA]; the house start value in bold where it differs from both.

| kind | attack | decay | sustain | release | shape to start from |
|---|---|---|---|---|---|
| PIANO | 1 / 2 ms | 970 ms / 710 ms; **1.5 s** | 0 / 0.41; **0** | 33 / 163 ms; **60 ms** | decaying |
| KEYS | 2 / 7 ms | 327 / 841 ms; **1.2 s** | 0.25 / 0.54; **0.2** | 52 / 230 ms; **150 ms** | decaying with a floor |
| ORGAN | 1 / 11 ms | - | 1.0 / 0.8; **1.0** | 2 / 65 ms; **5 ms** | gate |
| STRINGS | 101 ms / - ; **250 ms** | 245 ms; **1 s** | 0.85; **0.9** | 285 ms; **1.2 s** | swell |
| PAD | 58 / 257 ms; **500 ms** | 141 / 702 ms | 1.0 / 1.0; **0.8** | 270 / 742 ms; **1.5 s** | swell |
| LEAD | 1 / 2 ms; **5 ms** | 86 / 410 ms; **576 ms** | 1.0 / 1.0; **0.85** | 16 / 69 ms; **80 ms** | sustained |
| PLUCK | 1 / 2 ms; **0** | 83 / 216 ms; **300 ms** | 0.075 / 0.29; **0** | 39 / 113 ms; **100 ms** | pluck |
| BASS | 1 / 2 ms | 227 / 272 ms; **576 ms** | 0.65 / 1.0; **0.9** | 18 / 31 ms; **70 ms** | sustained or gate |
| BRASS | 6 ms; **30 ms** | 430 ms; **500 ms** | 0.63; **0.9** | 25 ms; **250 ms** | sustained, settles |
| BELL | 1 / 11 ms; **0** | 363 / 542 ms; **2.5 s** | 0 / 0.5; **0** | 306 / 901 ms; **2.5 s** | decaying = release |
| ARP | 1 / 2 ms | 35 / 277 ms; **576 ms gated** | 0.0075 / 0.41; **0** | 26 / 45 ms; **11 ms** | pluck, gated |
| SEQUENCE | 4 / 0 ms | 118 ms / 1.0 s | 0.84 / 1.0 | 67 / 85 ms | gate |
| STAB | - / 0 ms | - / 460 ms | - / 0.29 | - / 36 ms | pluck with a floor |
| CHORD | 4 / 11 ms | 320 / 575 ms | 0.5 / 0.85 | 25 / 82 ms | sustained |
| FX | 2 / 2 ms | 184 / 914 ms | 0.58 / 1.0 | 107 / 90 ms | anything; the modulation shapes it |
| DRUMS | 1 / 0 ms | 76 / 575 ms; **150 to 400 ms** | 0 / 1.0; **0** | 33 / 26 ms | pluck |
| ACID | 1 / 2 ms | 462 / 216 ms | 0.41 / 0.88 | 23 / 32 ms | sustained, filter does the work |
| WIND | 33 ms | 108 ms | 0.66 | 11 ms | sustained |
| VOCAL | 1 ms (sampled) ; **400 ms** | - | 1.0 | 10 ms; **1.2 s** | swell |

### 4.2 Filter envelope (GLOW) per kind

HW amount in octaves, SW as a share of the cutoff knob; on = share of patches with one [DATA].

| kind | on HW / SW | amount HW / SW | attack | decay HW / SW | sustain | release HW / SW | decay vs amp |
|---|---|---|---|---|---|---|---|
| PIANO | 66 % / 80 % | 4.2 oct / 0.53 | 1 ms | 598 / 248 ms | 0 / 0.12 | 80 / 137 ms | 1.0x / 0.26x |
| KEYS | 70 / 72 | 5.3 / 0.41 | 2 to 7 ms | 661 / 565 ms | 0.21 / 0.11 | 400 / 482 ms | 1.06x / 0.68x |
| ORGAN | 42 / 67 | 2.3 / 0.44 | 1 to 11 ms | 21 / 163 ms | 0.13 / 0.20 | 13 / 23 ms | 1.0x |
| STRINGS | 48 / - | 2.7 / - | 8 ms (0.28x amp) | 308 ms | 0.21 | 236 ms | 1.08x |
| PAD | 53 / 52 | 3.4 / 0.36 | 13 ms / 364 ms (swell 1.58 s) | 563 ms / 1.1 s | 0.10 / 0.25 | 565 ms / 1.22 s | 2.56x / 1.04x |
| LEAD | 58 / 62 | 4.0 / 0.50 | 1 ms | 162 / 227 ms | 0.18 / 0.08 | 102 / 156 ms | 1.31x / 0.98x |
| PLUCK | 81 / 84 | 5.2 / 0.55 | 1 ms | 57 / 152 ms | 0.006 / 0 | 220 / 220 ms | 0.91x / 0.73x |
| BASS | 62 / 75 | 4.6 / 0.57 | 1 ms | 122 / 214 ms | 0.055 / 0.023 | 51 / 78 ms | 0.61x / 1.0x |
| BRASS | 78 / - | 4.9 / - | 8 ms (2 to 46) | 301 ms | 0.40 | 34 ms | 1.0x |
| BELL | 67 / 62 | 4.4 / 0.33 | 1 to 11 ms | 128 / 257 ms | 0.04 / 0 | 352 / 561 ms | 0.54x / 1.0x |
| ARP | 68 / 77 | 4.6 / 0.62 | 1 ms | 27 / 173 ms | 0 / 0 | 52 / 81 ms | 1.0x / 0.61x |
| SEQUENCE | 35 / 40 | 4.8 / 0.16 | 4 / 0 ms | 194 / 108 ms | 0.32 / 0 | 488 / 80 ms | 0.65x / 0.33x |
| STAB | - / 61 | - / 0.57 | 0 ms | 201 ms | 0.04 | 74 ms | 0.58x |
| CHORD | 35 / 73 | 2.7 (33 % inverted) / 0.44 | 4 / 11 ms | 151 / 165 ms | 0.27 / 0.11 | 58 / 51 ms | 1.17x / 0.44x |
| FX | 54 / 32 | 5.5 / 0.53 | 4 / 7 ms | 169 ms / 1.01 s | 0.02 / 0 | 300 / 415 ms | 1.0x / 1.79x |
| DRUMS | 36 / 24 | 4.6 (15 % inverted) / 0.40 | 1 to 7 ms | 16 / 283 ms | 0 / 0 | 69 / 90 ms | 0.27x / 0.74x |
| ACID | 80 / 88 | 3.5 / 0.22 | 1 ms | 83 / 174 ms | 0.03 / 0 | 1.32 s / 48 ms | 1.2x / 0.71x |
| WIND | 82 / - | 4.1 / - | 7 ms (0.32x amp) | 93 ms | 0.62 | 43 ms | 0.97x |

### 4.3 Movement per kind

HW medians unless marked SW [DATA]; the wheel and velocity columns say where the hand goes.

| kind | LFO on (HW / SW) | vibrato rate | main LFO destinations (HW) | LFOs synced (HW / SW) | velocity goes to | wheel goes to |
|---|---|---|---|---|---|---|
| PIANO | 54 % / 53 % | 3.6 Hz (chorus-like PWM 0.88 Hz) | pw shape 49 %, pitch 25 %, cutoff 22 % | 0 % / 73 % | amp 81 %, cutoff 30 % (depth 0.41) | none; pitch / LFO depth where used |
| KEYS | 26 / 68 | 3.3 Hz; tremolo 2.6 Hz; filter tremolo 5.6 Hz | cutoff 70 %, amp 57 % | 0 % / 30 % | amp 81 %, cutoff 22 % | LFO depth 33 % SW (tremolo) |
| ORGAN | 56 / 81 | 3.06 Hz; scanner 6.86 Hz | pitch 44 %, cutoff 38 %, pan 27 % (rotary 0.81 Hz) | 0 % / 75 % | none (14 %) | LFO depth 44 %, drive |
| STRINGS | 59 / - | 4.85 Hz | pitch 52 %, pw shape 43 % (1.39 Hz) | 2 % / - | amp 70 %, cutoff 52 % | pitch (vibrato), Air |
| PAD | 75 / 72 | 3.06 Hz at 0.02 depth (drift) | pw shape 60 % (1.1 Hz), pitch 60 %, cutoff 31 % (0.11 Hz SW), pan 17 % (0.44 Hz) | 5 % HW / 67 % SW | amp 67 %, filter env 54 % (gently) | cutoff 72 % SW (the Air) |
| LEAD | 53 / 62 | 3.23 Hz HW, 6.86 Hz SW | pitch 51 %, pw shape 46 %, cutoff 37 % | 7 % / 72 % | filter env 51 %, amp 49 % | vibrato; cutoff 68 % SW |
| PLUCK | 92 / 51 | 3.06 Hz (a blip) | pitch 90 %, pw shape 47 %, pan 25 % (0.4 Hz) | 10 % / 63 % | amp 78 %, filter env 67 % (used in 69 %) | cutoff 85 % SW |
| BASS | 55 / 31 | 3.06 Hz | pitch 43 %, pw shape 33 % (1 Hz), cutoff 29 % | 4 % / 78 % (wobble at 1/4) | cutoff 53 % SW; amp 39 % HW | cutoff 74 % SW |
| BRASS | 60 / - | 4.24 Hz delayed | pitch 50 %, pw shape 35 % (0.71 Hz), cutoff 29 % | 1 % / - | amp 80 %, cutoff 43 % | cutoff, vibrato |
| BELL | 36 / 74 | 4.47 Hz (shimmer) | pitch 54 %, cutoff 37 %, pw shape 32 % | 0 % / 82 % | amp 80 to 100 %, cutoff 43 % | LFO depth 50 % SW |
| ARP | 80 / 56 | 3.06 Hz | pitch 71 %, cutoff 53 % (0.55 Hz), pw shape 51 % (0.42 Hz), pan 28 % (0.24 Hz) | 37 % / 77 % | filter env 82 % (the accent), amp 54 % | cutoff 62 % SW |
| SEQUENCE | 46 / 70 | - | cutoff 53 % (4.84 Hz), pw shape 29 %, pitch 24 % | 3 % / 92 % | cutoff 100 % SW | LFO depth, glide |
| STAB | - / 40 | 7 Hz (shimmer) | wave morph, cutoff, pw shape | - / 94 % | cutoff 57 %, amp 43 % | cutoff 86 % |
| CHORD | 62 / 77 | - | pw shape 44 %, amp 44 %, cutoff 44 % (1.1 Hz) | 0 % / 86 % | amp 71 %, cutoff 59 % (used in 77 %) | cutoff 38 %, LFO depth 29 % |
| FX | 73 / 74 | 3.06 Hz; 0.076 to 16 Hz overall | pitch 69 %, cutoff 51 %, pw shape 36 %, pan 26 % (0.35 Hz) | 14 % / 77 % | amp 75 %, filter env 61 % | cutoff 54 %, LFO depth 59 % SW |
| DRUMS | 56 / 69 | 3.06 Hz HW, 5.0 Hz SW (pitch drop) | pitch 72 % | 4 % / 84 % (loops) | amp 92 % | decay, noise level |
| ACID | 99 / 38 | 3.06 Hz | pitch 72 %, pan 40 % (1.05 Hz), cutoff 36 % (0.35 Hz) | 18 % / 79 % | amp 58 %, filter env 46 %; cutoff 78 % SW | cutoff 53 to 71 % (used in 29 to 47 %) |
| WIND | 63 / - | 4.89 Hz; tremolo 5.98 Hz | pitch 61 %, amp 32 %, cutoff 32 % | 0 % / - | amp 77 %, cutoff 27 % | - |

### 4.4 Effects per kind (SW medians when heard) [DATA, LAW]

| kind | reverb: on, mix, decay, pre-delay, low cut | delay: on, mix, feedback, subdivision | chorus: on, mix | distortion: on, drive | the law |
|---|---|---|---|---|---|
| PIANO | 47 %, 0.34, 2 s, 55 ms, 150 Hz | 73 %, 0.4, 0.5 | 47 %, 0.43 (1980s only) | 27 %, 0.10 | room or small hall; nothing else on a grand |
| KEYS | 52 %, 0.35, 1.5 s, 27 ms, 180 Hz | 44 %, 0.25, 0.37, 1/8 | 36 % SW / 81 % HW, 0.50 | 6 % | chorus is the effect; plate or room |
| ORGAN | 74 %, 0.47, room, 27 ms | 81 %, 1.0 (doubling), 0.23 | 48 %, 0.46 slow (or the scanner) | the preamp DRIVE | rotary cabinet's room |
| STRINGS | 64 %, 0.65, hall 3 s, 30 ms, 200 Hz | 64 %, 0.48, 1/4 dotted | 73 %, 0.47 ensemble (0.13 Hz, depth 0.69) | 0 % | ensemble before the hall |
| PAD | 76 %, 0.44, hall 4.6 s, 31 ms, 120 to 200 Hz | 62 %, 0.33, 0.5, 1/4 or 1/2 dotted | 44 % SW / 65 % HW, 0.37 after the filter | 20 %, 0.21 at mix 0.39 | three distances; chorus after the filter |
| LEAD | 77 %, 0.33, plate 2 to 3.9 s, 35 ms, 160 to 200 Hz | 74 %, 0.26, 0.44, 1/8 dotted filtered | 37 %, 0.26 | 42 %, 0.33 at mix 1.0 | delay first, reverb on the send |
| PLUCK | 81 %, 0.38, plate 3.5 s, 43 ms | 85 %, 0.34, 0.5, 1/8 dotted filtered ducked | 39 %, 0.24 | 38 %, 0.27 at mix 0.5 | the delay is the pluck's effect |
| BASS | 37 %, 0.25, 3 s, 21 ms, 81 Hz (send low cut 300 Hz) | 29 %, 0.21, 0.4 | 25 %, 0.18 above 150 Hz only | 50 %, 0.29 at mix 0.88, after the filter | nothing stereo or wet under 120 Hz |
| BRASS | 75 %, 0.35, hall 2 to 2.5 s, 30 ms, 200 Hz | 50 %, 0.43, 0 (slapback) | 50 %, 0.18 (66 % HW) | 12 % | chorus, hall, a little HEAT PRE |
| BELL | 58 %, 0.43, hall 6.8 s, 0 ms, 90 to 150 Hz, width 0.58 | 77 %, 1.0 (doubling), 0.28; or 1/4 dotted 0.25 | 45 %, 0.34; phaser 60 % HW | 4 % | long hall, no pre-delay, narrower |
| ARP | 85 %, 0.37, 7.3 s, 22 ms | 85 %, 0.33, 0.4, off the arp's subdivision | 34 %, 0.48 | 39 %, 0.30 at mix 0.66 | delay-lock law; duck the tail |
| SEQUENCE | 65 %, 0 (brought in), 1.4 s, 0 ms | 87 %, 0 (brought in), 0.45 | 43 %, 0 | 48 %, 0.28 at mix 1.0; bitcrush 7 % | the wheel brings the space in |
| STAB | 99 %, 0.18, 7.9 s, 0 ms, width 0.33 | 61 %, 0, 0.4 | 22 %, 0.24 | 88 %, 0.24 at mix 0.57 | dry hit, long narrow wash |
| CHORD | 79 %, 0.27, 2 s, 20 ms | 85 %, 0.6, 0.22, 1/4 dotted | 26 %, 0.38; phaser 26 % | 14 % | the delay carries the chord |
| FX | 72 %, 0.26 to 0.6, 1.4 to 8 s, 0 (hits) to 120 ms (textures) | 63 %, 0.25 to 0.4, 0.46 to 0.8, 1/2 | 35 %, 0.22; flanger 7 % | 34 %, 0.34 at mix 1.0 | chain order is the preset |
| DRUMS | 57 %, 0.19, room/plate 0.6 to 1.5 s, 0 ms, snare only | 23 %, 0.18, 0.21 | 40 %, widener | 60 %, 0.33 at mix 1.0 | kick DRY; gate keyed from the dry |
| ACID | 44 %, 0.31, 3.1 s, 19 ms | 67 %, 0.35, 0.37, 1/8 dotted | 35 %, 0 | 74 %, 0.38 at mix 1.0 | distortion and delay; the sequence is the sound |

### 4.5 Engines to kinds

| engine | first choice for | also | not for |
|---|---|---|---|
| ANALOG | bass, lead, brass, strings (machine), pluck, keys (synth), organ (synth), wind | pad Body, Air, Edge, click | bells (harmonic) |
| SUB | the Ground of everything | sub bass | a Body |
| FIRESAW | lead, pad Body and Air, strings (section), stab, chord, texture | reese, trance pluck, arp stab | bass under 150 Hz without a SUB, bells |
| FM | bell, e-piano (synth), glass, mallet, growl bass, metal perc, digital lead | brass (DX), organ (FM) | strings, pads (unless layered) |
| NOISE | breath, click, strike, hat, snare, riser, texture | the imperfection on anything | a Body |
| PIANO | piano | - | anything else |
| FIREBLOOM | pad (own), bell (STRIKE), lo-fi lead, texture (MOTION ALL), sync lead | keys, glassy pluck | bass |
| FIREBASS | every bass, kick, impact | acid, 808 | melodic kinds above the bass |
| FIREKEYS | reed e-piano | - | - |
| FIRETINE | tine e-piano, tine pluck | bell-ish keys | - |
| FIREWHEEL | organ | house stab, bass (TWIN FOOTAGES on FIREBASS instead) | - |

---

## 5. The gate: before calling a patch done

Every patch, in this order [LAW]:

1. **First note sells it**: one key, cold, default velocity, no wheel.
2. **It plays**: velocity audible (never only volume on a pad); the wheel does something (vibrato on leads, no exceptions); aftertouch should; cutoff tracks pitch, measured at two points.
3. **It moves**: something changes by 2 s and something else by 8 s, from the engine alone (space off); nothing so much that the second note is a different patch.
4. **It sits**: -6 dBFS peak at v100 on a four-note chord; the bank within 1 LU; mono-compatible, no hole over 3 dB in 100 to 500 Hz on the mono sum; everything under 120 Hz mono; nothing under 40 Hz; nothing clips inside the chain; if it needs a limiter it is not finished.
5. **One identity, one imperfection**, both named in the notes.
6. **It is ours**: something only this machine does (FIREBLOOM's motion, BURN's scream, FIREBASS's locked sub, GROUP DRIFT, same-engine stacking, a two-head delay); a patch a Serum trial could make is a wasted slot.
7. **Measured, then frozen**: level at three velocities; sync lands at 120, 90 and 140 BPM; tail below -60 dB in the stated time; no runaway feedback at any wheel position; under 20 ms to first sound for pluck, bass, lead, key.
8. **Named to be found**: `CATEGORY . Name`, three words max, describes the sound not the recipe, no machine or brand names; the notes carry identity, wheel, velocity, tempo assumption.
9. **Every module on has a reason; nothing pinned or hidden**; a routing profile named where the machine has them; every effect placement chosen with its host on and its amount non-zero; the space named (default Room is not a choice).
10. **Per kind**: pluck and arp: delay off the arp's subdivision, ducked; arp: 8 or 16 steps that resolve, gate set, velocity map not flat, in a named key; bass: lows mono, no chorus under 150 Hz, glide off unless the note says why; pad: three distances, release at least the attack; lead: vibrato on the wheel, glide legato only; bell: release equal to decay; piano and keys: v40 and v110 differ in level and colour; organ: no velocity, no ADSR.
11. **Render a version with each slot alone** so a weak layer cannot hide behind the others; a bank version at each of 120, 90 and 140 BPM for anything synced.
12. **the author hears it.** The gate makes it shippable; the ear makes it a keeper.

---

## 6. Sources

- `modulation-analysis.md` (13,369 patches: routes, LFOs, velocity, wheel, aftertouch per kind; Part 4 "what it means for Stellix"), `envelope-analysis.md` (amp and filter envelope medians and shapes per kind), `effects-analysis.md` (every effect heard, per kind, with settings), `arpeggiator-analysis.md` (arp modes, rates, gates, patterns), `planet-moons-data.md` (1,119 branded presets: macros, LFO orbits, held time from 374 MIDI files, modulation weight), `reverb-measured.md` (Tabula 1's 31 reverb programs against the 7.4 targets), the per-synth decoding notes (`diva.md`, `hardware.md`, `serum1.md`, `serum2.md`, `vital.md`, `sylenth1.md`, `spire.md`, `zebra2.md`, `phase-plant.md`): all generated by `tools/research/*` from the patches database (`tabula_research`), read-only, no preset or pack named.
- `patch-making.md`: the seven recipe rounds, the author's verdicts (`recipe-verdicts.json`), "what the liked ones have".
- `preset-generation.md`: Tabula's engines and every parameter (sections 10 to 13), what was wrong with the first banks (section 1), the census of the Virus, JP-8000, X5DR and MegaSynth banks (section 4), L105 glide.
- `preset-design-law` (skill and `documentation/preset-design-law.md` v0.2): the universal laws, the category laws, the recipe cards, the gate.
- `stellix-sound-recipes.md` (2026-10-31-a): the starting recipes in Stellix terms.
- Physical and historical reasons ([WHY]) are standard synthesis knowledge: the harmonic series of the basic waves, FM sidebands, the behaviour of struck strings and tines, the JP-8000, Juno, OB-Xa, CS-80, DX7, 303 and Solina designs as published; where a recipe card carries a `[PUB]` tag in the law it is a published starting point, not a measurement.

What the data could not answer, and so is a guess here: release velocity (one route in 13,369 patches), audio measurements per kind (91 renders, none categorised), velocity curve shapes, the Andromeda's route destinations, Zebra2's send levels, synced LFO divisions on the Virus, Supernova and Nord Lead, and the Virus arp patterns (in firmware, not read). Where this document and a measurement disagree, the measurement wins and this document is the bug.
