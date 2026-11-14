---
# concepts: cpp, js, python, tooling
paths:
  - "placeholder"
---

# An NRPN number or a packed value is decoded and written back exactly

An NRPN parameter number is two bytes, and a machine may pack several parameters into one number or one byte. A decode that is off by a shift reads every patch plausibly and wrong.

<constraints>
Always do:
- Form the parameter number as `(MSB << 7) | LSB` (7 bits per byte; a machine whose chart packs a whole byte per half uses `<< 8`, and says so), and check each number against the manufacturer's chart.
- Read an LSB that selects a namespace as part of the number, not as a value.
- Decode a packed NRPN as the ranges it holds, one parameter per range, and name each range.
- Write every decoded value back through the same packing on export, and prove a byte-exact round trip over the corpus.
- Keep a controller's edit behaviour apart from its stored polarity: one that edits relative to the current value can still be stored unipolar. Decide polarity from the stored values.

Never do:
- Treat the MSB alone as the parameter, or the two bytes as a 14-bit value when the chart says number and value.
- Let two parameters share a packed byte without a test that setting one leaves the other unchanged.
</constraints>
