# STRINGS


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

- **"Pulse Strings"**: ANALOG PULSE WIDTH 0.35 VOICES 7 DETUNE 0.2, LP 12 cutoff 0.6, SWELL 300 ms / 1 s / 1.0 / 1.0 s, PWM 1.2 Hz depth 0.3; MOD ensemble 0.5 (the sound itself); reverb hall 0.3. No filter envelope.

Recipes in this machine's own engines are not here: this project's recipe file (`layout.json` `recipes`, default `docs/recipes/*.md`) has the machine's own.

**Mistakes.** A filter envelope on a string machine (it becomes a brass or a pad). Release shorter than attack (the bow is cut). No vibrato (a saw is not a string until it moves). Resonance over 0.2 (a string section has no peak). Reverb low cut off (the cellos drown the bass).
