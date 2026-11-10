# LEAD


**What the ear needs.** One voice that cuts: a bright, slightly edgy tone with a fast attack (a 5 to 10 ms click), a sustain that holds for the phrase, a vibrato that the player brings in on the wheel after the note has landed, a little glide between legato notes, and a space (delay first, then reverb) that makes one note sound like a line. Two lanes and one identity [LAW]: the supersaw is the lead, the edge is a second slot high-passed and quiet. [WHY] a lead is heard in the mix's busiest band (500 Hz to 4 kHz), so it needs a peak there (LP 12, not 24) and movement the ear can follow (vibrato at 5 to 7 Hz, the rate of a singer's).

**The data says** [DATA]: 1,272 SW leads: sustained 48 %, gate 39 %, attack 2 ms, release 69 ms; filter envelope on 62 % at 0.50 of travel with decay 227 ms; LFO to pitch in 57 % at 6.86 Hz (HW leads 3.23 Hz: the older vibrato is slower); mod wheel in 47 % to cutoff (68 %) and LFO depth (25 %); delay on 74 %, reverb 77 %, distortion 42 % at drive 0.33, chorus 37 %; the HW LFO rate is the most varied lead control (spread 0.57): the vibrato is where leads differ most.

**Engine and roles** [LAW]:

- **The lead (lane 1):** FIRESAW (SAWS 14, SPLIT 2, DETUNE 0.35, MIX 0.7, SPREAD 0.5, GROUP DRIFT 0.15, DRIFT 0.1) for the trance / big-room lead; ANALOG SAW VOICES 3 DETUNE 0.15 for the analogue lead; ANALOG PULSE WIDTH 0.3 with PWM for the reedy lead; FM (a brass or bell program, BRIGHT 1.2) for the digital lead; ANALOG with SYNC (FIREBLOOM SYNC 0.6) for the hard sync lead (Prophet card: GLOW to the sync pitch).
- **The edge (lane 2):** ANALOG PULSE or SQUARE +12 st, HP about 400 Hz, -6 dB against lane 1, no unison. It gives the top without a second supersaw.
- **The floor (optional, screaming leads):** SUB SQUARE -1 oct -12 dB, no filter: the Burn Lead's floor.
- Mono or two-voice legato, glide 30 to 80 ms (the data's lead glide: 19 % of branded leads have a glide macro at 0.41 of travel) [DATA, LAW]. Glide is off by default on every other kind [LAW: L105].

**Filter.** LP 12 dB (CASCADE) for the classic lead: cutoff 0.55 to 0.75, resonance under 0.15, KT 100 %. BURN LP for the Stellix scream: cutoff 0.55, resonance 0.6, HEAT and SCREAM up, DAMAGE on velocity. GLOW +0.25 to +0.4, VEL 50 to 60 %: the HW lead filter envelope is 4.0 octaves, SW 0.50 of travel [DATA]. The cutoff is modulated in 84 % of SW leads [DATA].

**Envelopes** [DATA]:

| stage | HW lead (657) | SW lead (1272) | start from |
|---|---|---|---|
| SWELL attack | 1 ms (1 to 4) | 2 ms (1 to 6) | 5 ms (the click) |
| SWELL decay | 86 ms (2 to 675) | 410 ms (0 ms to 1 s) | 576 ms |
| SWELL sustain | 1.0 (0.47 to 1.0) | 1.0 (0.52 to 1.0) | 0.85 |
| SWELL release | 16 ms (4 to 117) | 69 ms (15 to 200) | 80 ms |
| GLOW amount | 4.0 oct (2.0 to 6.3), on 58 % | 0.50 (0.30 to 0.79), on 62 % | +0.25, VEL 50 % |
| GLOW attack | 1 ms | 1 ms (1 to 28) | 1 ms |
| GLOW decay | 162 ms (20 to 892) | 227 ms (87 to 699) | 570 ms |
| GLOW sustain | 0.18 (0 to 0.47) | 0.08 (0 to 0.36) | 0.4 |
| GLOW release | 102 ms | 156 ms (24 to 773) | 85 ms |

The gate shape (36 % HW, 39 % SW): many leads are a pure gate with the filter doing all the shaping. The filter release is 2.88x the amp's in HW leads: the tail darkens as it goes [DATA].

**Movement.** The wheel vibrato: 5 to 6.5 Hz, 0 to +/-25 cents, 300 ms LFO delay [LAW]; SW leads sit at 6.86 Hz (3.3 to 44: the top is a trill or a pitch FM) [DATA]. PWM at 1 Hz on a pulse lead (46 % of HW leads) [DATA]. Osc mix stepped at 1/2 or 1/4 on 14 % of branded leads (a rhythmic lead) [DATA]. FIRESAW DRIFT is the 8 s movement on a held note. The mod wheel is the classic lead control and it goes to vibrato depth, no exceptions [LAW].

**Playing.** Velocity to the filter envelope amount and the amp equally (HW 51 % and 49 %); SW leads: amp 43 %, cutoff 41 % [DATA]. On BURN, velocity also opens DAMAGE. Wheel = vibrato. Aftertouch = vibrato depth too, or the cutoff (76 % of HW lead aftertouch routes) [DATA]. Pitch bend +/-2 st (a lead player bends a tone; +/-12 only for the dive).

**Effects** [DATA, LAW]: HEAT PRE 0.3 (or distortion 0.46 at mix 1.0: the data's lead median is drive 0.33 at mix 1.0, on in 42 %). Chorus 0.17 to 0.26 at 0.6 Hz, 3 voices. Delay first: 1/8 dotted at 0.19 to 0.26, feedback 0.44, filtered in the loop (HP 300, LP 5 k), on 74 %. Reverb on the send: plate, pre-delay 30 to 35 ms, decay 2 s (SW 3.9 s), mix 0.3, low cut 160 to 200 Hz. The macro the makers reach for most on a lead is the reverb mix (69 % of branded leads) [DATA].

**Identity and imperfection.** The drifting double supersaw (Solar Lead) or the BURN scream at high velocity (Burn Lead). The imperfection: the two groups wander; or self-oscillation at the top of the wheel; or the delay saturating.

**Starting recipes** [LAW]

- **"Voodoo Lead"** (the JD-800 card [PUB]): ANALOG PULSE narrow (WIDTH 0.15), resonance 0.7, filter drive full, GLOW to cutoff +0.4 decay 70 ms sustain 0, KT 60 to 100 %, distortion before the filter, plate after.

Recipes in this machine's own engines are not here: this project's recipe file (`layout.json` `recipes`, default `docs/recipes/*.md`) has the machine's own.

**Mistakes.** No vibrato on the wheel (fails review). LP 24 on a lead (it loses the band it lives in). Two supersaws (two identities: louder, not clearer). Reverb before delay in the mix balance (the line smears). Glide on every note (ALWAYS mode: it is a slide whistle); legato only. A gate with nothing on the filter (a buzzer).
