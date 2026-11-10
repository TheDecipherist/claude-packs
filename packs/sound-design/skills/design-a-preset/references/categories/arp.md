# ARP


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
- Variants: "Pad Arp" (the Juno pad with gate 85 % at 1/8: the pad becomes rhythm), "Acid Arp" (the Acid Line at 1/16 with the wheel on resonance), "Bell Arp" (Glock at 1/16, delay 1/8 triplet: a music box).

Recipes in this machine's own engines are not here: this project's recipe file (`layout.json` `recipes`, default `docs/recipes/*.md`) has the machine's own.

**Mistakes.** The delay on the arp's own subdivision (echoes land on notes: mud). Flat velocity (the data's SW arps have it and it is why they sound like a machine). Gate 100 % (the notes merge). Every pattern in C. Decay longer than two steps without a reason (a pad-arp is a choice, not an accident). Reverb mix over 0.4 without ducking (the pattern disappears).
