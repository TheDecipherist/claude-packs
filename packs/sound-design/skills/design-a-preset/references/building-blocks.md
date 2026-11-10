# The building blocks and why they work

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
