---
# concepts: cpp, js, notes, tooling
paths:
  - "placeholder"
---

# A listing counts only from an address a vector or a call target reached

A linear sweep from an address picked by hand desyncs without an error: the listing reads as code and is fiction after the first misread length.

<constraints>
Always do:
- Start a listing at an address a vector, a reset entry or a call target reaches, and follow from there.
- With no proven boundary, count instruction encodings instead of decoding: a count carries no desync.
- Read a conditional by what the code intends, and check each branch target against the raw bytes.
- Suspect swapped operands when a result is always zero or constant.

Never do:
- Disassemble from an address you picked and call the result a finding.
- Read a branch's meaning off the mnemonic alone.
</constraints>
