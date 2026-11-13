---
name: measure-an-envelope
description: Use when an envelope's stages, a filter sweep's timing or a note's onset are to be read from renders, or when an arp's onsets are counted.
---

# Measure an envelope (one job: stages and onsets from renders)

A threshold on level finds a quiet note late and a loud one early. The rise and the crossings do not move with level.

<constraints>
Always do:
1. Frame the render at 20 ms and read the stages from the frames: level for an amplitude envelope, the spectral centroid for a filter envelope.
2. Take the attack as the first crossing of half the sustained level, never the time of the peak.
3. Find an onset by the rise of the signal, not by a level threshold. Test it on the softest signal the machine makes.
4. For an arp, give the onset detector a 30 ms refractory period, and put the test note well inside one frame.
5. When a table scan fails to give a pattern's rhythm, read it from a held note.
6. Write the stage times as measured values with the frame size beside them.

Never do:
- Read an attack from the peak time, or an onset from a fixed level.
- Test the detector on a loud note only.
</constraints>
