# DRUMS


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

- **"Snap Snare"**: NOISE WHITE BAND 0.6 WIDTH 0.6 HP 150 Hz, SWELL 0 / 150 ms / 0 / 60 ms, GLOW +0.3 decay 40 ms VEL 80 %; ANALOG TRI fixed 190 Hz drop -20 st 20 ms, SWELL 0 / 80 ms / 0 / 30 ms, -6 dB; distortion 0.3; plate 0.25 pre 5 ms 1.2 s.
- **"909 Hat"**: NOISE WHITE BAND 0.9 HP 6 kHz, closed SWELL 0 / 60 ms / 0 / 20 ms, open (velocity over 100) 0 / 300 ms / 0 / 100 ms; FM high-ratio metal -12 dB; chorus 0.2 as a widener; no reverb.
- **"Kit Loop"**: the three above in three slots, LENGTH 30 %, a step row per slot (kick on 1 and 3 with ghosts, snare 2 and 4, hats 1/8 with velocity map), swing 54, the snare's BAND on a 0.4 Hz LFO.

Recipes in this machine's own engines are not here: this project's recipe file (`layout.json` `recipes`, default `docs/recipes/*.md`) has the machine's own.

**Mistakes.** Sustain above 0 (a drum does not hold). Reverb on the kick (the low end smears). Key tracking on the kick (a different kick on every key). The pitch drop too slow on a kick (a tom) or absent (a thud). Velocity flat (a machine). A unison stack on noise (nothing: noise is already every frequency).
