# Quick reference tables

### 4.1 Amp envelope (SWELL) medians per kind

HW / SW medians [DATA]; the house start value in bold where it differs from both.

| kind | attack | decay | sustain | release | shape to start from |
|---|---|---|---|---|---|
| PIANO | 1 / 2 ms | 970 ms / 710 ms; **1.5 s** | 0 / 0.41; **0** | 33 / 163 ms; **60 ms** | decaying |
| KEYS | 2 / 7 ms | 327 / 841 ms; **1.2 s** | 0.25 / 0.54; **0.2** | 52 / 230 ms; **150 ms** | decaying with a floor |
| ORGAN | 1 / 11 ms | - | 1.0 / 0.8; **1.0** | 2 / 65 ms; **5 ms** | gate |
| STRINGS | 101 ms / - ; **250 ms** | 245 ms; **1 s** | 0.85; **0.9** | 285 ms; **1.2 s** | swell |
| PAD | 58 / 257 ms; **500 ms** | 141 / 702 ms | 1.0 / 1.0; **0.8** | 270 / 742 ms; **1.5 s** | swell |
| LEAD | 1 / 2 ms; **5 ms** | 86 / 410 ms; **576 ms** | 1.0 / 1.0; **0.85** | 16 / 69 ms; **80 ms** | sustained |
| PLUCK | 1 / 2 ms; **0** | 83 / 216 ms; **300 ms** | 0.075 / 0.29; **0** | 39 / 113 ms; **100 ms** | pluck |
| BASS | 1 / 2 ms | 227 / 272 ms; **576 ms** | 0.65 / 1.0; **0.9** | 18 / 31 ms; **70 ms** | sustained or gate |
| BRASS | 6 ms; **30 ms** | 430 ms; **500 ms** | 0.63; **0.9** | 25 ms; **250 ms** | sustained, settles |
| BELL | 1 / 11 ms; **0** | 363 / 542 ms; **2.5 s** | 0 / 0.5; **0** | 306 / 901 ms; **2.5 s** | decaying = release |
| ARP | 1 / 2 ms | 35 / 277 ms; **576 ms gated** | 0.0075 / 0.41; **0** | 26 / 45 ms; **11 ms** | pluck, gated |
| SEQUENCE | 4 / 0 ms | 118 ms / 1.0 s | 0.84 / 1.0 | 67 / 85 ms | gate |
| STAB | - / 0 ms | - / 460 ms | - / 0.29 | - / 36 ms | pluck with a floor |
| CHORD | 4 / 11 ms | 320 / 575 ms | 0.5 / 0.85 | 25 / 82 ms | sustained |
| FX | 2 / 2 ms | 184 / 914 ms | 0.58 / 1.0 | 107 / 90 ms | anything; the modulation shapes it |
| DRUMS | 1 / 0 ms | 76 / 575 ms; **150 to 400 ms** | 0 / 1.0; **0** | 33 / 26 ms | pluck |
| ACID | 1 / 2 ms | 462 / 216 ms | 0.41 / 0.88 | 23 / 32 ms | sustained, filter does the work |
| WIND | 33 ms | 108 ms | 0.66 | 11 ms | sustained |
| VOCAL | 1 ms (sampled) ; **400 ms** | - | 1.0 | 10 ms; **1.2 s** | swell |

### 4.2 Filter envelope (GLOW) per kind

HW amount in octaves, SW as a share of the cutoff knob; on = share of patches with one [DATA].

| kind | on HW / SW | amount HW / SW | attack | decay HW / SW | sustain | release HW / SW | decay vs amp |
|---|---|---|---|---|---|---|---|
| PIANO | 66 % / 80 % | 4.2 oct / 0.53 | 1 ms | 598 / 248 ms | 0 / 0.12 | 80 / 137 ms | 1.0x / 0.26x |
| KEYS | 70 / 72 | 5.3 / 0.41 | 2 to 7 ms | 661 / 565 ms | 0.21 / 0.11 | 400 / 482 ms | 1.06x / 0.68x |
| ORGAN | 42 / 67 | 2.3 / 0.44 | 1 to 11 ms | 21 / 163 ms | 0.13 / 0.20 | 13 / 23 ms | 1.0x |
| STRINGS | 48 / - | 2.7 / - | 8 ms (0.28x amp) | 308 ms | 0.21 | 236 ms | 1.08x |
| PAD | 53 / 52 | 3.4 / 0.36 | 13 ms / 364 ms (swell 1.58 s) | 563 ms / 1.1 s | 0.10 / 0.25 | 565 ms / 1.22 s | 2.56x / 1.04x |
| LEAD | 58 / 62 | 4.0 / 0.50 | 1 ms | 162 / 227 ms | 0.18 / 0.08 | 102 / 156 ms | 1.31x / 0.98x |
| PLUCK | 81 / 84 | 5.2 / 0.55 | 1 ms | 57 / 152 ms | 0.006 / 0 | 220 / 220 ms | 0.91x / 0.73x |
| BASS | 62 / 75 | 4.6 / 0.57 | 1 ms | 122 / 214 ms | 0.055 / 0.023 | 51 / 78 ms | 0.61x / 1.0x |
| BRASS | 78 / - | 4.9 / - | 8 ms (2 to 46) | 301 ms | 0.40 | 34 ms | 1.0x |
| BELL | 67 / 62 | 4.4 / 0.33 | 1 to 11 ms | 128 / 257 ms | 0.04 / 0 | 352 / 561 ms | 0.54x / 1.0x |
| ARP | 68 / 77 | 4.6 / 0.62 | 1 ms | 27 / 173 ms | 0 / 0 | 52 / 81 ms | 1.0x / 0.61x |
| SEQUENCE | 35 / 40 | 4.8 / 0.16 | 4 / 0 ms | 194 / 108 ms | 0.32 / 0 | 488 / 80 ms | 0.65x / 0.33x |
| STAB | - / 61 | - / 0.57 | 0 ms | 201 ms | 0.04 | 74 ms | 0.58x |
| CHORD | 35 / 73 | 2.7 (33 % inverted) / 0.44 | 4 / 11 ms | 151 / 165 ms | 0.27 / 0.11 | 58 / 51 ms | 1.17x / 0.44x |
| FX | 54 / 32 | 5.5 / 0.53 | 4 / 7 ms | 169 ms / 1.01 s | 0.02 / 0 | 300 / 415 ms | 1.0x / 1.79x |
| DRUMS | 36 / 24 | 4.6 (15 % inverted) / 0.40 | 1 to 7 ms | 16 / 283 ms | 0 / 0 | 69 / 90 ms | 0.27x / 0.74x |
| ACID | 80 / 88 | 3.5 / 0.22 | 1 ms | 83 / 174 ms | 0.03 / 0 | 1.32 s / 48 ms | 1.2x / 0.71x |
| WIND | 82 / - | 4.1 / - | 7 ms (0.32x amp) | 93 ms | 0.62 | 43 ms | 0.97x |

### 4.3 Movement per kind

HW medians unless marked SW [DATA]; the wheel and velocity columns say where the hand goes.

| kind | LFO on (HW / SW) | vibrato rate | main LFO destinations (HW) | LFOs synced (HW / SW) | velocity goes to | wheel goes to |
|---|---|---|---|---|---|---|
| PIANO | 54 % / 53 % | 3.6 Hz (chorus-like PWM 0.88 Hz) | pw shape 49 %, pitch 25 %, cutoff 22 % | 0 % / 73 % | amp 81 %, cutoff 30 % (depth 0.41) | none; pitch / LFO depth where used |
| KEYS | 26 / 68 | 3.3 Hz; tremolo 2.6 Hz; filter tremolo 5.6 Hz | cutoff 70 %, amp 57 % | 0 % / 30 % | amp 81 %, cutoff 22 % | LFO depth 33 % SW (tremolo) |
| ORGAN | 56 / 81 | 3.06 Hz; scanner 6.86 Hz | pitch 44 %, cutoff 38 %, pan 27 % (rotary 0.81 Hz) | 0 % / 75 % | none (14 %) | LFO depth 44 %, drive |
| STRINGS | 59 / - | 4.85 Hz | pitch 52 %, pw shape 43 % (1.39 Hz) | 2 % / - | amp 70 %, cutoff 52 % | pitch (vibrato), Air |
| PAD | 75 / 72 | 3.06 Hz at 0.02 depth (drift) | pw shape 60 % (1.1 Hz), pitch 60 %, cutoff 31 % (0.11 Hz SW), pan 17 % (0.44 Hz) | 5 % HW / 67 % SW | amp 67 %, filter env 54 % (gently) | cutoff 72 % SW (the Air) |
| LEAD | 53 / 62 | 3.23 Hz HW, 6.86 Hz SW | pitch 51 %, pw shape 46 %, cutoff 37 % | 7 % / 72 % | filter env 51 %, amp 49 % | vibrato; cutoff 68 % SW |
| PLUCK | 92 / 51 | 3.06 Hz (a blip) | pitch 90 %, pw shape 47 %, pan 25 % (0.4 Hz) | 10 % / 63 % | amp 78 %, filter env 67 % (used in 69 %) | cutoff 85 % SW |
| BASS | 55 / 31 | 3.06 Hz | pitch 43 %, pw shape 33 % (1 Hz), cutoff 29 % | 4 % / 78 % (wobble at 1/4) | cutoff 53 % SW; amp 39 % HW | cutoff 74 % SW |
| BRASS | 60 / - | 4.24 Hz delayed | pitch 50 %, pw shape 35 % (0.71 Hz), cutoff 29 % | 1 % / - | amp 80 %, cutoff 43 % | cutoff, vibrato |
| BELL | 36 / 74 | 4.47 Hz (shimmer) | pitch 54 %, cutoff 37 %, pw shape 32 % | 0 % / 82 % | amp 80 to 100 %, cutoff 43 % | LFO depth 50 % SW |
| ARP | 80 / 56 | 3.06 Hz | pitch 71 %, cutoff 53 % (0.55 Hz), pw shape 51 % (0.42 Hz), pan 28 % (0.24 Hz) | 37 % / 77 % | filter env 82 % (the accent), amp 54 % | cutoff 62 % SW |
| SEQUENCE | 46 / 70 | - | cutoff 53 % (4.84 Hz), pw shape 29 %, pitch 24 % | 3 % / 92 % | cutoff 100 % SW | LFO depth, glide |
| STAB | - / 40 | 7 Hz (shimmer) | wave morph, cutoff, pw shape | - / 94 % | cutoff 57 %, amp 43 % | cutoff 86 % |
| CHORD | 62 / 77 | - | pw shape 44 %, amp 44 %, cutoff 44 % (1.1 Hz) | 0 % / 86 % | amp 71 %, cutoff 59 % (used in 77 %) | cutoff 38 %, LFO depth 29 % |
| FX | 73 / 74 | 3.06 Hz; 0.076 to 16 Hz overall | pitch 69 %, cutoff 51 %, pw shape 36 %, pan 26 % (0.35 Hz) | 14 % / 77 % | amp 75 %, filter env 61 % | cutoff 54 %, LFO depth 59 % SW |
| DRUMS | 56 / 69 | 3.06 Hz HW, 5.0 Hz SW (pitch drop) | pitch 72 % | 4 % / 84 % (loops) | amp 92 % | decay, noise level |
| ACID | 99 / 38 | 3.06 Hz | pitch 72 %, pan 40 % (1.05 Hz), cutoff 36 % (0.35 Hz) | 18 % / 79 % | amp 58 %, filter env 46 %; cutoff 78 % SW | cutoff 53 to 71 % (used in 29 to 47 %) |
| WIND | 63 / - | 4.89 Hz; tremolo 5.98 Hz | pitch 61 %, amp 32 %, cutoff 32 % | 0 % / - | amp 77 %, cutoff 27 % | - |

### 4.4 Effects per kind (SW medians when heard) [DATA, LAW]

| kind | reverb: on, mix, decay, pre-delay, low cut | delay: on, mix, feedback, subdivision | chorus: on, mix | distortion: on, drive | the law |
|---|---|---|---|---|---|
| PIANO | 47 %, 0.34, 2 s, 55 ms, 150 Hz | 73 %, 0.4, 0.5 | 47 %, 0.43 (1980s only) | 27 %, 0.10 | room or small hall; nothing else on a grand |
| KEYS | 52 %, 0.35, 1.5 s, 27 ms, 180 Hz | 44 %, 0.25, 0.37, 1/8 | 36 % SW / 81 % HW, 0.50 | 6 % | chorus is the effect; plate or room |
| ORGAN | 74 %, 0.47, room, 27 ms | 81 %, 1.0 (doubling), 0.23 | 48 %, 0.46 slow (or the scanner) | the preamp DRIVE | rotary cabinet's room |
| STRINGS | 64 %, 0.65, hall 3 s, 30 ms, 200 Hz | 64 %, 0.48, 1/4 dotted | 73 %, 0.47 ensemble (0.13 Hz, depth 0.69) | 0 % | ensemble before the hall |
| PAD | 76 %, 0.44, hall 4.6 s, 31 ms, 120 to 200 Hz | 62 %, 0.33, 0.5, 1/4 or 1/2 dotted | 44 % SW / 65 % HW, 0.37 after the filter | 20 %, 0.21 at mix 0.39 | three distances; chorus after the filter |
| LEAD | 77 %, 0.33, plate 2 to 3.9 s, 35 ms, 160 to 200 Hz | 74 %, 0.26, 0.44, 1/8 dotted filtered | 37 %, 0.26 | 42 %, 0.33 at mix 1.0 | delay first, reverb on the send |
| PLUCK | 81 %, 0.38, plate 3.5 s, 43 ms | 85 %, 0.34, 0.5, 1/8 dotted filtered ducked | 39 %, 0.24 | 38 %, 0.27 at mix 0.5 | the delay is the pluck's effect |
| BASS | 37 %, 0.25, 3 s, 21 ms, 81 Hz (send low cut 300 Hz) | 29 %, 0.21, 0.4 | 25 %, 0.18 above 150 Hz only | 50 %, 0.29 at mix 0.88, after the filter | nothing stereo or wet under 120 Hz |
| BRASS | 75 %, 0.35, hall 2 to 2.5 s, 30 ms, 200 Hz | 50 %, 0.43, 0 (slapback) | 50 %, 0.18 (66 % HW) | 12 % | chorus, hall, a little HEAT PRE |
| BELL | 58 %, 0.43, hall 6.8 s, 0 ms, 90 to 150 Hz, width 0.58 | 77 %, 1.0 (doubling), 0.28; or 1/4 dotted 0.25 | 45 %, 0.34; phaser 60 % HW | 4 % | long hall, no pre-delay, narrower |
| ARP | 85 %, 0.37, 7.3 s, 22 ms | 85 %, 0.33, 0.4, off the arp's subdivision | 34 %, 0.48 | 39 %, 0.30 at mix 0.66 | delay-lock law; duck the tail |
| SEQUENCE | 65 %, 0 (brought in), 1.4 s, 0 ms | 87 %, 0 (brought in), 0.45 | 43 %, 0 | 48 %, 0.28 at mix 1.0; bitcrush 7 % | the wheel brings the space in |
| STAB | 99 %, 0.18, 7.9 s, 0 ms, width 0.33 | 61 %, 0, 0.4 | 22 %, 0.24 | 88 %, 0.24 at mix 0.57 | dry hit, long narrow wash |
| CHORD | 79 %, 0.27, 2 s, 20 ms | 85 %, 0.6, 0.22, 1/4 dotted | 26 %, 0.38; phaser 26 % | 14 % | the delay carries the chord |
| FX | 72 %, 0.26 to 0.6, 1.4 to 8 s, 0 (hits) to 120 ms (textures) | 63 %, 0.25 to 0.4, 0.46 to 0.8, 1/2 | 35 %, 0.22; flanger 7 % | 34 %, 0.34 at mix 1.0 | chain order is the preset |
| DRUMS | 57 %, 0.19, room/plate 0.6 to 1.5 s, 0 ms, snare only | 23 %, 0.18, 0.21 | 40 %, widener | 60 %, 0.33 at mix 1.0 | kick DRY; gate keyed from the dry |
| ACID | 44 %, 0.31, 3.1 s, 19 ms | 67 %, 0.35, 0.37, 1/8 dotted | 35 %, 0 | 74 %, 0.38 at mix 1.0 | distortion and delay; the sequence is the sound |

### 4.5 Source kinds to kinds

Generic: the kind of source each kind of sound needs (from the "source" column of `what-a-synth-needs.md`). The table of this machine's own engines belongs in the project's recipe file.

| source kind | first choice for | also | not for |
|---|---|---|---|
| band-limited waves (saw, pulse, square, tri, sine; detuned unison) | bass, lead, brass, strings (machine), pluck, keys (synth), organ (synth), wind | pad Body, Air, Edge, click | bells (harmonic) |
| a sub oscillator, an octave or two down | the Ground of everything | sub bass | a Body |
| a seven-saw supersaw with detune, mix and drift | lead, pad Body and Air, strings (section), stab, chord, texture | reese, trance pluck, arp stab | bass under 150 Hz without a sub, bells |
| inharmonic: FM, ring modulation, hard sync with a pitch envelope | bell, e-piano (synth), glass, mallet, growl bass, metal percussion, digital lead | brass, organ (FM) | strings, pads (unless layered) |
| noise with band and width | breath, click, strike, hat, snare, riser, texture | the imperfection on anything | a Body |
| a physical model of a struck string | piano | - | anything else |
| a bit-shaped wave with motion | pad, bell (with a strike), lo-fi lead, texture, sync lead | keys, glassy pluck | bass |
| a phase-locked body-and-sub bass engine | every bass, kick, impact | acid, 808 | melodic kinds above the bass |
| a reed or tine model with pickup position | e-piano, tine pluck | bell-ish keys | - |
| additive sines at footages (tonewheel, drawbars) | organ | house stab | - |
