# PIANO (acoustic)


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

**Starting recipes**

Recipes in this machine's own engines are not here: this project's recipe file (`layout.json` `recipes`, default `docs/recipes/*.md`) has the machine's own.

**Mistakes.** Velocity flat (it is 80 % of the sound). Sustain above 0 on a piano shape (a piano never holds). Reverb without pre-delay (the strike drowns). A compressor (kills the one thing a piano has). Chorus on a grand (makes it an e-piano).
