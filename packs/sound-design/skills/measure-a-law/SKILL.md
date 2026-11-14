---
name: measure-a-law
description: Use when fitting or checking a law against a machine or a reference recording.
---

# Measure a law (one job: a fit that can be defended)

<constraints>
Always do:
1. Use a sine at the frequency being read. A filter slope read on a saw was off by 2.3 dB per octave.
2. Write a filter's law in the units its procedure uses.
3. Fix it with two anchors.
4. Keep fitted constants scripted, tagged, and rerunnable.
5. Write disproofs down.
6. Name a second quantity, independent of the first, that must also hold. A low standard deviation cannot see a bias; drop the rows that fail the second.
7. Beside any fit whose two parameters trade off, take a model-free measurement of one of them.
8. Measure a ratio against a reference inside the same render, so the level, the gain and the chain cancel.
9. Write the predicted number before measuring, and report the difference.
10. Read a broad peak in a fit as a wrong sign or a wrong unit, and check both before trusting the fit.
11. Name an isolation set in every sweep script (what is held fixed), and print it with each result.
12. Derive neutral values from the parameter map. The map's default is the displayed value, not the stored byte.
13. Measure the part alone through the same code that measured the reference, never through a copy of it.
14. Fit a pitch table at both 440 and 442 Hz, and let the machine's own adjustment procedure decide which it uses.
15. Convert a manual's clock-face statements by the pot's travel, solved from printed figures that must agree (a wrong travel put a law 0.75 octave out).

Never do:
- Fit a single point.
</constraints>
