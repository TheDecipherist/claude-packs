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

Never do:
- Call a division test proof of a clock.
- Widen a tolerance to hide an offset. Assert it does not move, and log the open item.
</constraints>
