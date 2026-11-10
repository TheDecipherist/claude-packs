# BASS


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

- **"Moog Bass"** (the card): ANALOG SAW and SQUARE 40/60 3 cents apart, SUB SINE -6 dB, SUPER LP 24 cutoff 0.25 reso 0.25, GLOW +0.5 decay 200 ms sustain 0.25 VEL 60 %, SWELL 1 ms / 400 ms / 0.8 / 40 ms, HEAT POST 0.4 (the ladder drive: after the filter), mono legato, aftertouch to cutoff +0.15.
- **"Acid Line"**: ANALOG SAW, SVF LP 24 cutoff 0.25 reso 0.7 KT 60 %, GLOW 0 / 200 ms / 0 / 1 s +0.4, accent (v over 100) +0.3 to the amount, SWELL 1 ms / 462 ms / 0.4 / 25 ms, legato glide 60 ms, wheel to cutoff, distortion 0.4 mix 1.0, delay 1/8 dotted 0.2 filtered; ships with a SEQ in C with 2+ accents and 1 slide per bar.
- **"Growl"**: FM bass program BRIGHT 0.7 FEEDBACK 0.5 velocity to BRIGHT +0.5, LP 24 cutoff 0.5 GLOW +0.3 decay 150 ms; SUB SINE -1 oct -6 dB; distortion 0.4; an LFO 1/4 synced on BRIGHT depth 0.3 under the wheel.

Recipes in this machine's own engines are not here: this project's recipe file (`layout.json` `recipes`, default `docs/recipes/*.md`) has the machine's own.

**Mistakes.** Stereo under 120 Hz (chorus, unison, a wide reverb on the sub: the mix falls apart on a club system). Release over 100 ms on a fast line. Glide ALWAYS (every note slides: a siren). Reverb on the sub. A saw plus a SUB slot that are not phase-aligned (use FIREBASS, or PHASE RESET on both). Velocity to volume only (the weight must stay, the bark must change). Resonance over 0.3 on anything but acid (the fundamental thins). Playing it an octave too high (reese) or too low (a saw bass under 40 Hz is a rumble).
