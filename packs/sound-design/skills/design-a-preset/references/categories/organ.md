# ORGAN


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

**Starting recipes**

Recipes in this machine's own engines are not here: this project's recipe file (`layout.json` `recipes`, default `docs/recipes/*.md`) has the machine's own.

**Mistakes.** Velocity on (an organ with velocity is a synth). An ADSR with a slow attack (a pad). Reverb hall at 0.5 (the wall washes out; organs live in rooms and cabinets). Chorus plus scanner (two wobbles beat against each other).
