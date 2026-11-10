# PLUCK


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
- **"Kalimba"**: FM mallet program BRIGHT 0.9 velocity to BRIGHT +0.5, SWELL 0 / 600 ms / 0 / 200 ms, no filter envelope (FM is the brightness), NOISE click -24 dB 10 ms; room 0.25, delay 1/4 triplet 0.2.
- Variants: "Pluck Pad" (sustain 0.4, GLOW decay 1 s: a pluck that stays), "Guitar" (ANALOG SAW-TRI SHAPE 0.4, BP cutoff 0.5 width 0.3, GLOW decay 60 ms +0.3, SWELL decay 1.5 s sustain 0, a 3 ms "second string" slot detuned 8 cents).

Recipes in this machine's own engines are not here: this project's recipe file (`layout.json` `recipes`, default `docs/recipes/*.md`) has the machine's own.

**Mistakes.** Filter envelope longer than the amp's (then it is a stab or a swell, not a pluck). Sustain above 0.3 without a reason. Delay on the same subdivision as the arp that will play it (the echo lands on the next note: use 1/8 dotted under a 1/16 arp [LAW]). Delay loop unfiltered (mud after four repeats). Attack over 5 ms (the pluck is gone). A unison stack (a pluck is one string).
