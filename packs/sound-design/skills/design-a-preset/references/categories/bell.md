# BELL


**What the ear needs.** A strike and a ring: an instant attack with a bright, inharmonic burst (partials at non-integer ratios: 1, 2.0, 2.4, 3.0, 4.5, 5.3 is a church bell; 1, 2.76, 5.4 a tubular bell), a long decay (1 to 3 s held) that is also the release (a bell does not stop when the key is let go), the high partials dying first, velocity to the strike's brightness, and a chorus or detune so the partials beat. [WHY] a saw's partials are all integer multiples, so no filter can make a bell from it; only FM, ring modulation, sync or a bit-shaped wave gives the inharmonic set. This is the one category where the engine choice is not optional.

**The data says** [DATA]: 114 HW bells: pluck shape 47 %, decaying 11 %, long tail 7 %; amp decay 363 ms (86 ms to 1.0 s), sustain 0, release 306 ms (86 ms to 1.1 s), the longest HW release of the struck kinds; filter envelope on 67 % at 4.4 octaves with decay 128 ms (0.54x the amp's: the brightness goes first); velocity used in 45 % HW, 87 % SW, to the amp 80 to 100 % and the cutoff 43 %; LFO to pitch in 54 % at 4.47 Hz; chorus on 68 % HW, phaser 60 %; SW bells: release 901 ms, reverb decay 6.8 s (the longest reverb of any kind), delay on 77 % at mix 1.0 (a doubling), amp envelope attack 11 ms and sustain 0.5 on the Serum default (do not copy that).

**Engine and roles.**

- **FM:** a bell program (the DX7 tubular bell: carrier 1.0, modulator 3.5 with a fast-decaying index), BRIGHT 0.8 to 1.2, FEEDBACK 0.2 to 0.4, velocity to BRIGHT +0.5 (the harder the strike the more sidebands). The strike is the modulator's envelope; the FM program carries it.
- **FIREBLOOM:** BITS 0.6, EDGE high, FADE short, STRIKE 0.5 with STRIKE RATIO 14 (the glassy tine) or 5.4 (the tubular bell), STRIKE TIME 0.07 s, STRIKE CLICK 0.25: the bit-shaped wave gives the partials, STRIKE the burst. A second slot ANALOG SINE +24 st -12 dB with SWELL 0 / 300 ms / 0 / 300 ms is the hammer's ping.
- **Analogue bell (the PPG card):** two ANALOG SINE or TRI slots at a non-octave interval (+19 st and +31 st, or one at +5 st and one at +14), ring or a hard SYNC (FIREBLOOM SYNC) with GLOW on the sync pitch falling over 200 ms (the table sweep on the attack [LAW]), plus the fundamental slot.
- **Glass / mallet:** FM glockenspiel or marimba program, BRIGHT 0.9, decay shorter (600 ms to 1.2 s); NOISE click.

**Filter.** Open or LP 12 at 0.8 with GLOW +0.3 decay 150 ms as the strike's extra brightness; KT 100 %. On FM the filter is not the brightness (BRIGHT is); on FIREBLOOM EDGE and STRIKE are. The cutoff still tracks (67 % of HW bells have a filter envelope).

**Envelopes** [DATA]:

| stage | HW bell (114) | SW bell (53) | start from |
|---|---|---|---|
| SWELL attack | 1 ms (1 to 3) | 11 ms (default-dominated) | 0 to 1 ms |
| SWELL decay | 363 ms (86 ms to 1.0 s) | 542 ms (216 ms to 1.2 s) | 2.5 s, EXP 2 |
| SWELL sustain | 0.002 (0 to 0.5) | 0.5 (default) | 0 |
| SWELL release | 306 ms (86 ms to 1.1 s) | 901 ms (642 ms to 1.2 s) | 2.5 s (the ring continues) |
| GLOW amount | 4.4 oct (3.0 to 6.0), on 67 % | 0.33 (0.20 to 0.40) | +0.3 (or BRIGHT / STRIKE) |
| GLOW decay | 128 ms (9 to 863) | 257 ms (198 to 668) | 150 ms (the strike) |
| GLOW sustain | 0.04 (0 to 0.54) | 0 | 0 |
| GLOW release | 352 ms | 561 ms | 300 ms |

The HW amp decay (363 ms) is short because many HW "bells" are DX e-piano and glock patches; a tubular bell is 2 to 4 s. The release equal to the decay is the law: the ring must not depend on how long the key is held.

**Movement.** The partials beating: two slots 5 to 8 cents apart, or FIREBLOOM SPREAD 0.2, or a chorus 0.3. LFO to pitch at 4.47 Hz (3.1 to 4.8) in 54 % of HW bells: a slow shimmer of +/-3 cents, not a vibrato [DATA]. Autopan at 2.5 to 2.9 Hz on 10 % HW, 46 % SW [DATA]. Over 8 s a bell is still ringing; it needs nothing more.

**Playing.** Velocity to the amp (80 % HW, 100 % SW) and to the strike's brightness (cutoff 43 %, BRIGHT, STRIKE) [DATA]: a soft bell is a round hum, a hard bell is glass. Velocity is used in 87 % of SW bells, the most of any SW kind. The wheel: the chorus depth or the decay (SWELL decay +50 %). Aftertouch: used in 21 % of SW bells, to LFO rate and pitch (a shimmer under pressure) [DATA]. Key tracking: the decay should shorten up the keyboard (halve every 18 semitones, as FIREKEYS does); a row or key-to-decay assign -30 %.

**Effects** [DATA, LAW]: reverb hall or big, pre-delay 0 to 20 ms (SW bells 0 ms: the strike and the room arrive together), decay 4 to 7 s (SW 6.8 s), mix 0.4 (SW 0.43), low cut 90 to 150 Hz, width 0.6 (SW 0.58: bells are narrower than pads). Delay 1/4 dotted at 0.25, feedback 0.28, or a doubling (SW bells: delay on 77 % at mix 1.0) [DATA]. Chorus 0.34 (on 45 % SW, 68 % HW) or a phaser 0.33 (60 % HW: the DX bell through a phaser) [DATA]. No distortion (4 %), no compressor.

**Identity and imperfection.** The inharmonic strike (FM) or FIREBLOOM's STRIKE at ratio 14. The imperfection: two partials beating slowly, or the hammer ping a touch louder on the top octave.

**Starting recipes** [LAW]

- **"Crystal Bell"**: FM bell program BRIGHT 0.8 FEEDBACK 0.3, velocity to BRIGHT +0.5, SWELL 0 / 2.5 s / 0 / 2.5 s EXP 2; filter open KT 100 %; reverb hall 0.4 5 s pre 10 ms low cut 120 Hz width 0.6, delay 1/4 dotted 0.25.
- **"Glock"**: FM glockenspiel program BRIGHT 1.0, SWELL 0 / 900 ms / 0 / 900 ms, NOISE WHITE click -24 dB 8 ms, room 0.3 pre 0, delay 1/8 0.15. Velocity to BRIGHT +0.6.
- **"Tubular"**: FM tubular program BRIGHT 0.9, SWELL 0 / 4 s / 0 / 4 s, decay shortening up the keyboard -30 %, big reverb 7 s 0.45.

Recipes in this machine's own engines are not here: this project's recipe file (`layout.json` `recipes`, default `docs/recipes/*.md`) has the machine's own.

**Mistakes.** A saw or a pulse as the bell's body (harmonic: it is an organ with a decay). Sustain above 0 (a bell cannot hold). Release shorter than the decay (the ring is cut when the key lifts). A vibrato (bells shimmer, they do not sing). Pre-delay 40 ms (the strike separates from the room and sounds like two events). Serum's default envelope (11 ms attack, sustain 0.5) left in: 34 % of SW bells have it and it is not a bell.
