---
name: clock-probe
description: Use when adding sync to a unit, when a delay or LFO should follow tempo, or when a clock test passes and the unit may still be deaf.
---

# Prove the clock (one job: the unit follows tempo, measured in its audio)

<constraints>
Read `clock-law.md` beside this file for the full law.

Always do:
1. Choose the observable: a pure gain first, then pulse width, a stereo null, pitch, a filter, a comb.
2. Measure at 120, 90 and 140 BPM, in the audio.
3. Drive raw `0xF8` pulses with no playhead. Tempo reads back, and Stop releases the lock.
4. Set the unit's field to 120 against a host at 90, then the mirror at 150. It must keep its own tempo when internal.
5. Assert the beat alignment, not only the spacing.
6. Check two renders are bit-identical apart from the thing under test.
7. Plant the fault, see it red, and revert at once.
8. Check the default at open: leave the unit untouched, measure each time destination at 120 and at 90 BPM, standalone and as a plugin, and judge it with `.claude/tools/open-default-probe.mjs`. A probe that sets up the thing it tests cannot see a bad default. When a feature does nothing, check its default before its wiring.
9. Run the probe with the transport playing: a stopped host sends no clock. To isolate one tap, zero its division as well as its value, since a division overrides the stored time.
10. For a unit with no time destination, gate the sound through an LFO-rate destination and measure it at three tempos.
11. Probe a transport jump, a loop and a time-signature change.
12. For an echo, also measure each repeat's peak, rise time and spread against the dry hit and a textbook delay at the same settings, not only its arrival time.
13. State the tone the probe measures: solo one oscillator, drift and unison off, and list every parameter set and why, since a few-Hz beat as large as the effect fools the probe.

Never do:
- Call a division test proof of a clock.
- Widen a tolerance to hide an offset. Assert it does not move, and log the open item.
</constraints>
