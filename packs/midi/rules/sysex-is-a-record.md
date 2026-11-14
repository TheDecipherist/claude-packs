---
# concepts: cpp, js, python, tooling
paths:
  - "placeholder"
---

# A program is records: keep them together, and round-trip every byte

<constraints>
Always do:
- Expect a program to be several messages, in any order. Key each by bank and program, and merge.
- Take a record's length from its type, never from a constant.
- Keep unknown bytes verbatim, and prove a byte-exact round trip over every patch.
- Test 7-bit packing with known plaintext: the usual scheme can give the right length with every byte wrong.
- Prove per machine whether the sysex layout is the RAM layout.
- Keep a parser's field as stored, and accept a reading only with zero violations over the corpus.
- Round-trip the plugin's own export of an edited patch, not only the factory dumps.
- Decode off the audio thread.
- Watch for bytes that change what their neighbours mean: flag bytes, shared enums, bit fields.
- Record a controller's wire semantics apart from its stored byte, and prove the stored form from the record, never from the CC table: a CC table's "bipolar" is not the stored byte.

Never do:
- Parse only the first message of a program: every effects knob sat at its default for weeks.
- Assume `F0` to `F7` runs uninterrupted.
</constraints>

## Check
Lesson checks for this rule: `sysex-length-literal`, `sysex-not-on-audio`.
