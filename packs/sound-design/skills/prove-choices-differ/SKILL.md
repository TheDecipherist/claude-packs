---
name: prove-choices-differ
description: Use when a choice control (a waveform, a mode, an algorithm or a curve selector) is added or its options change.
---

# Prove choices differ (one job: every option of a choice control sounds unlike the others)

A selector whose two options null against each other is one option with two names.

<constraints>
Always do:
1. Render every option with the same note, level and every other control fixed.
2. Measure the N by N difference between the renders, as in `spread-probe`.
3. Fail the control when any two options null, and name the pair.

Never do:
- Count the options of a choice as a feature before the N by N difference is measured.
</constraints>
