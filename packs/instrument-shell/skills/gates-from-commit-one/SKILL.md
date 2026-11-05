---
name: gates-from-commit-one
description: Use when starting a new instrument, or when asked what gates a unit needs.
---

# Gates from the first commit (one job: a unit is proved from the day it exists)

<constraints>
Always do:
1. Start from the skeleton, with its gates wired into ctest.
2. Give each gate an in-process fault injection, and see it red.
3. Write to the state you inject: an injection that passes means dead code or a missing check.
4. Gate: clock, render reproduces, byte-exact round trip, spread, panel hit test.
5. Audit for dead bindings, and for fields decoded but never read.
6. Test the gate itself, against a known-good unit and a known-bad one.
7. Name in a verdict which half of an AND failed.

Never do:
- Add gates after the bugs: nine units shipped deaf that way.
</constraints>
