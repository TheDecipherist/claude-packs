---
# concepts: cpp, js, python, tooling, tests
paths:
  - "placeholder"
---

# Test where a wrong answer cannot pass

<constraints>
Always do:
- Vary the thing the error lives in, all the way down: low, middle and high notes; the tempo, not the division; two points for "A follows B"; phase apart from rate.
- Take expected values from the printed source, not the code.
- Trace where a term acts: velocity on depth is not velocity on output.
- Excite what you test. A click hid 100x of preset difference.
- Use two anchors to fix a law: one fits any curve.
- Test every velocity layer, and a relative threshold at more than one level.
- Read the block's invariant before gating on it.
- Sum by power, never by amplitude.
- Suspect a first-time pass: a test that never failed has not yet shown it can.

Never do:
- Use one point that is zero exactly where everyone auditions: `note - 60` passes at middle C.
- Compare a function with itself.
- Invent a term. It is worse than a missing one.
</constraints>

## Check
`no-literal-key-anchor` refuses a test anchored on a literal key such as middle C, and `test-compares-a-function-with-itself` refuses a test that compares a function with itself.
