# KEYS and E-PIANO (synth piano, tine, reed, clav)


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

**Starting recipes**

Recipes in this machine's own engines are not here: this project's recipe file (`layout.json` `recipes`, default `docs/recipes/*.md`) has the machine's own.

**Mistakes.** Velocity to level only (the colour must change or it is an organ with a decay). Hall reverb (a keys patch lives in a room with a chorus). Sustain 1.0 (then it is a pad with a click). The same brightness on every key (SCATTER 0, AGE 0: a sampler, not an instrument).
