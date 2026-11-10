# BRASS


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
- **"OB Brass"** (the card): one ANALOG SAW VOICES 2, DOUBLE on (an octave up through the same engine), LP 12 cutoff 0.4 reso 0.15, GLOW 40 ms / 350 ms / 0.5 +0.4, SWELL 20 ms / 400 ms / 0.8 / 200 ms, chorus 0.3, aftertouch to cutoff +0.2.
- Variants: "Horn" (one SAW plus PULSE 0.3, mono legato glide 30 ms, cutoff 0.35, vibrato on the wheel 5 Hz: a solo French horn), "Sax" (PULSE WIDTH 0.25 plus NOISE breath -22 dB, BP cutoff 0.5 width 0.4 KT 100 %, GLOW attack 80 ms +0.4, vibrato 5.5 Hz delayed 500 ms, growl: an LFO 30 Hz on pitch depth 0.05 under aftertouch).

Recipes in this machine's own engines are not here: this project's recipe file (`layout.json` `recipes`, default `docs/recipes/*.md`) has the machine's own.

**Mistakes.** Filter attack 0 (then it is a stab or a lead, not brass). Sustain 1.0 (a brass note settles after the attack). Vibrato immediate (the swell and the vibrato together read as a wobble). No velocity to brightness (the blat is the instrument). LP 12 on a section (too bright; the 24 keeps it dark until the swell).
