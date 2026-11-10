---
name: design-a-preset
description: Use when designing, tuning, naming, reviewing or shipping a preset, patch, program, bank or INIT, asking how to make a kind of sound, or asking what a synth needs to make one.
---

# Design a preset (one job: a patch that passes the gate)

The method and the gate are here. The numbers are beside it; load only what the job needs:
- **A kind of sound:** `references/categories/<kind>.md` (piano, keys, organ, strings, pad, lead, pluck, bass, brass, bell, arp, sequence-stab-chord, fx, drums, wind-vocal), with `references/tables.md`.
- **Why a number works:** `references/building-blocks.md` (waves, tuning, filters, envelopes, movement, playing, effects, levels).
- **What a synth needs to make a kind:** `references/what-a-synth-needs.md`, for planning an engine from the sounds it must ship.
- **This machine's own engines:** the project's recipe file (`layout.json` `recipes`, default `docs/recipes/*.md`). The kit's recipes are the generic ones.

A number's source is tagged: **[DATA]** measured over 6,223 hardware and 7,146 plugin factory patches; **[LAW]** the house's decision, kept until a measurement overturns it; **[WHY]** the physics or psychoacoustics; **[EAR]** the author's ear over seven rounds (253 presets heard, 92 liked). Where a measurement on this machine disagrees, the measurement wins.

## The words

- **Slot:** one oscillator with its own tune, level, pan, filter, amp envelope and filter envelope. A big sound is slots stacked on one key range. A slot has a **role** (Body, Air, Ground, Edge, Click, Sub); a recipe names the role, never the slot number.
- **Sources:** band-limited waves (saw, pulse, square, tri, sine, up to 8 unison voices); a sub oscillator; a seven-saw supersaw with detune, mix and drift [FIRESAW]; FM, six operators; noise with band and width; a physical piano model; a bit-shaped wave with motion [FIREBLOOM]; a phase-locked body-and-sub bass engine [FIREBASS]; a reed model [FIREKEYS]; a tine model with pickup position [FIRETINE]; a tonewheel organ with drawbars [FIREWHEEL].
- **Amp envelope** [SWELL] and **filter envelope** [GLOW]: A / D / S / R in ms or s, sustain 0 to 1, then the amount (-1 to +1) and VEL (how much velocity scales it).
- **Cutoff, resonance:** 0 to 1 of the knob (0.5 is about 1 kHz, 0.28 about 300 Hz, 0.65 about 2.5 kHz). **KT:** key tracking, 0 to 100 %.
- **Filter types:** a clean ladder, a state-variable, a warm 12 dB two-pole, a twin band and notch, and a drive filter of the house's own [BURN]. Slopes 6 to 24 dB/oct.
- **Drive** [HEAT], PRE or POST the filter. **Mod:** chorus, ensemble, phaser, flanger. **Delay:** synced or free, loop filtered. **Reverb** by program: room, plate, hall, big.
- **Row:** a tempo-clocked step modulator on one control. **Assign:** wheel, velocity, aftertouch or pressure on any control.

Every recipe is written with the machine's extra modulation (a sound map, macros) off: if it does not sound right without them, it is not right.

<constraints>
Always do:
1. **Start from INIT:** one saw in one slot, every module off, filter open, no effects. It is the reference every patch is heard against [LAW].
2. **Choose the engine and the wave for the identity.** The ear names one element in a good patch; decide it first.
3. **Tune the slots against each other:** octaves, fifths, a few cents. The same wave stacked on the same pitch is louder, not bigger [EAR].
4. **Set the filter:** type, slope, cutoff, resonance, key tracking. Cutoff is modulated in 89 % of hardware patches and 80 to 99 % of plugin patches per kind [DATA]; a filter that does nothing over the note is missing the main voice.
5. **Shape the envelopes,** amp first, then filter, each slot its own where the roles differ.
6. **Add the movement:** one thing heard by 2 s, another by 8 s.
7. **Wire the playing:** velocity always audible, the wheel always does something, key tracking on the cutoff. A dead wheel fails review like a dead knob [LAW].
8. **Effects last, and chosen:** the reverb named with its pre-delay, the delay on a subdivision with its loop filtered, chorus after the filter.
9. **Level by measurement, never typed:** -6 dBFS peak on a four-note chord at velocity 100; the bank within 1 LU; mono under 120 Hz; nothing under 40 Hz; limiter off [LAW].
10. **Run the gate** below. A patch is finished when it passes, not when it sounds good tonight.
11. Carry the author's ear as a bias [EAR]: liked patches had reverb (+16 points), a performance assign (+16), delay (+14), a slow attack (+10), a saw (+10); fewer had a unison stack (-16) or a mono voice (-10). Width from detuned slots and effects beats width from a unison stack; glide and mono only where the kind asks (acid, legato lead, bass).

Never do:
- Reach for the effects to hide a weak oscillator.
- Make one thing wider and call it big; give a pad vibrato; put velocity only on volume.
- Type a level, or leave a toolkit's default envelope in a shipped patch.
- Name a patch after a machine, a brand, an artist or a track.
</constraints>

## The gate: before calling a patch done

Every patch, in this order [LAW]. The measurable lines are measured by `node .claude/tools/prove-a-bank.mjs` on renders from `bounce-a-plugin`; the spread of the bank by `spread-probe`.

1. **First note sells it:** one key, cold, default velocity, no wheel.
2. **It plays:** velocity audible, never only volume on a pad; the wheel does something (vibrato on leads, no exceptions); cutoff tracks pitch at two points.
3. **It moves:** something changes by 2 s and something else by 8 s, from the engine alone; the second note is still the same patch.
4. **It sits:** -6 dBFS peak at v100 on a four-note chord; the bank within 1 LU; no hole over 3 dB in 100 to 500 Hz on the mono sum; everything under 120 Hz mono; nothing under 40 Hz; nothing clips in the chain. A patch that needs a limiter is not finished.
5. **One identity, one imperfection,** both named in the notes.
6. **It is this machine's:** it uses something only this engine does; a patch any plugin's trial could make is a wasted slot.
7. **Measured, then frozen:** level at three velocities; sync lands at 120, 90 and 140 BPM; tail below -60 dB in the stated time; no runaway feedback at any wheel position; under 20 ms to first sound for pluck, bass, lead and keys.
8. **Named to be found:** `CATEGORY . Name`, three words at most, the sound not the recipe, no machine or brand name; the notes carry identity, wheel, velocity and tempo.
9. **Every module on has a reason;** nothing pinned or hidden; every effect placement chosen with its amount non-zero; the space named (a default room is not a choice).
10. **Per kind:** pluck and arp: delay off the arp's subdivision, ducked; arp: 8 or 16 steps that resolve, gate set, velocity map not flat, in a named key; bass: lows mono, no chorus under 150 Hz, glide off unless the note says why; pad: three distances, release at least the attack; lead: vibrato on the wheel, glide legato only; bell: release equal to decay; piano and keys: v40 and v110 differ in level and colour; organ: no velocity, no envelope shape.
11. **Each slot alone:** a render with each slot solo, so a weak layer cannot hide; a version at 120, 90 and 140 BPM for anything synced.
12. **The owner hears it.** The gate makes it shippable; the ear makes it a keeper.
