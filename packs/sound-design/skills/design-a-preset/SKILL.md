---
name: design-a-preset
description: Use when designing, tuning, naming or reviewing a preset, a bank or an INIT, or asking how to make a kind of sound.
---

# Design a preset (one job: a program that sells itself on the first note and passes the gate)

The law for the bank, beside the panel's design laws. A preset is finished when it passes the gate, not when it sounds good tonight. The rule `presets-are-named-and-neutral` holds what every bank must; this is how to make one. Values below are published starting points unless the machine's own data replaces them.

## A preset on the platform

A program is a row of the parameter table (frozen id order) plus a name and a category. INIT is every module off and one clean saw through nothing. A parameter added later gets a default that leaves every existing preset bit-identical. A preset is authored on the panel and read back, never typed into the table, and one that depends on a pinned, hidden or off-law control is a bug.

## Three layers, and every control taken into account

The first bank of the house reference plugin had one placement in 309 of 316 presets and 59 controls that never varied. So a preset is three layers, each overriding only the one before:

1. **Base:** the machine on and in circuit. A preset that leaves two thirds of the plate at default sounds like one that did not load.
2. **Routing profile:** where each module sits and what drives it. A machine ships a small named set, and every preset names one.
3. **Recipe:** what this program is for. It wins over both.

Of two copies of a block, the player's copy gets a fixed job the user learns (the first filter always at the input); the patch's copy carries the variety. Choose every placement, never inherit it: a placement whose host is off is silence, however hard it is driven, and one without an amount is still inaudible. Name the space; the default room is not a choice. Use the shaping, not only the frequency. **Every control is used, or exempt with a written reason**, and a coverage check fails on a control that never varies with none.

## Universal laws

1. **First note sells it:** one key, cold, default velocity, no wheel.
2. **It plays:** velocity always does something audible (never only volume on a pad); the mod wheel always does something (vibrato on leads); aftertouch should; cutoff tracks pitch.
3. **It moves:** something changes by 2 s and something else by 8 s, and note two is still the same preset.
4. **It sits:** -6 dBFS peak at velocity 100 on a four-note chord; the bank matched within 1 LU; mono-compatible, everything under 120 Hz mono; nothing clips inside the chain. A preset that needs a limiter is not finished.
5. **One identity, one imperfection:** the ear names one element, and one deliberate hardware flaw (drift, a late second lane, a delay that saturates).
6. **It is this machine's:** it uses what only this engine does. A preset any trial synth could make is a wasted slot.
7. **Measured, then frozen:** level at three velocities; no hole over 3 dB in 100-500 Hz in the mono sum; wheel, velocity and aftertouch move the audio; sync lands at 120, 90 and 140; the tail falls below -60 dB in a stated time; no runaway feedback at any wheel position; under 20 ms to first sound for a pluck, bass, lead or key.
8. **Named to be found:** `CATEGORY . Name`, three words at most, the sound and not the recipe; the notes carry its identity, wheel, velocity and tempo.

## By kind

- **Pads:** three things at different distances, never one thing made wider: a body (one lane, the stack behind the bed, LP24 at 40-60 %, attack 300-800 ms), air (a second lane an octave up, high-passed, -9 dB, spread; the wheel opens it) and ground (a sub sine, -6 dB, mono, no filter). Warmth is a filter law: LP24, cutoff 35-55 %, resonance 10-20 %, chorus after the filter. One slow LFO (0.05-0.15 Hz) on cutoff; release at least the attack; a hall with 20-40 ms pre-delay and a low-cut send. Pan the air, centre the body, never pan the ground.
- **Plucks:** the envelope is the sound: amp A0 D150-400 S0 R50-150, a filter envelope shorter than the amp's, velocity to filter 50-80 %, keytrack 100 %, a dotted-eighth delay filtered and ducked.
- **Leads:** two lanes, one identity; LP12 55-75 %, a 5-10 ms attack click; the wheel is vibrato at 5-6.5 Hz, up to 25 cents, after a 300 ms delay; mono legato with 30-80 ms portamento; the reverb on the send.
- **Basses:** mono legato, no stack, no chorus under 150 Hz; LP24 20-35 %, envelope +40-60 %; velocity to envelope, aftertouch to cutoff; drive after the filter (before is another sound, and says so). Under 100 Hz mono, under 40 Hz gone.
- **Arps and sequences:** the preset is the pattern: 8 or 16 steps that resolve, gate 30-50 % for plucks and 70-90 % for pads, never 100 %; a velocity map that is never flat; the delay on a different subdivision from the arp; a sequence ships in C and survives 90-140 BPM.
- **Effects:** judged on a dry pluck, a pad and a drum loop, and usable on two. A delay's time relations are the preset, synced per channel, with a high-pass and a low-pass in the loop, always; feedback decides the category. A reverb's pre-delay is decided on every preset and its decay set by category; width under 100 %. A chain has one hero, and its order is the preset, chosen deliberately.

## The bank

Three flagships no other machine can make, each with a wheel move that changes the song; thirty a producer keeps; the rest real variations. One signature move per machine across the bank. Every category has its INIT. 128 slots; ship fewer if that is what passes. The categories are closed: a synth's `INIT PAD STRING LEAD PLUCK BASS KEY BELL BRASS ARP SEQ FX/TEXTURE DRUM`, an effect's `INIT DELAY REVERB CHAIN DYNAMIC TEXTURE`.

## Before calling a preset done

First note cold; velocity, wheel and keytrack audible; it moves by 2 s and 8 s; -6 dBFS, within 1 LU, mono clean; its identity and imperfection named; a routing profile named and every placement chosen with its host on; the space named; no module on without a reason; its name three words at most, in a closed category. For a bank: the flagships pass a one-hand 20-second demo, every category has its INIT, the coverage check is green, and `spread-probe` has counted the distinct sounds beside the total (the rule).
