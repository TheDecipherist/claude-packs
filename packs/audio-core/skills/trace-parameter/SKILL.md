---
name: trace-parameter
description: Use when a control sounds wrong, reads wrong, zips, jumps or does nothing; when the display and the sound disagree; or before changing how a parameter maps to its range.
---

# Trace one parameter from the host to the sound and the screen

This skill is read-only: it reports, and changes nothing.

## Steps
1. Name the parameter by its ID. Find its definition (parameter layout, range, skew, default, value-to-text).
2. Follow each hop and write down `file:line` and the exact transform at each:
   1. host or automation value (normalized 0–1);
   2. parameter tree, then the cached pointer (or the parameter snapshot for the block);
   3. smoothing: which smoother, what ramp time, and is it reset in `prepareToPlay`;
   4. the mapping to physical units (Hz, dB, ms…), and where that function lives;
   5. per-voice or per-sample use in the DSP;
   6. the audible result: render a short sweep of the parameter and run `measure-tone` if the sound itself is in question.
3. Follow the other branch: parameter → editor attachment → widget → displayed text. Write down the mapping used there.
4. Search for any second computation of the same value: `grep` for the parameter ID, its member name and its unit conversion.

## Report
A hop table with the columns Hop, `file:line`, Transform and Units. Then a list of findings, each tied to its rule:
- a second formula (`one-formula-per-value`);
- missing or wrong smoothing (`smooth-continuous-parameters`);
- a stepped value not snapped (`discrete-params-snap`);
- a lookup per block (`cached-parameter-pointers`);
- a unit or range mismatch;
- a hop that never runs.
