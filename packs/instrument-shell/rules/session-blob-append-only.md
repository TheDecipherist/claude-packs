---
# concepts: engine-source
paths:
  - "placeholder"
---

# A saved session is append-only: every old one still loads

<constraints>
Always do:
- Save a header and a prefix-compatible payload.
- Add fields at the end only, and assert padding.
- Test that a session from the last release loads.
- Keep the last release's blob as a literal in the test, and assert each old field's offset.
- Leave state untouched when a header is refused, and have a newer-version load report what it dropped.
- Read a unit's own legacy format first, and keep libraries beside the bank, not in the blob.

Never do:
- Insert or retype a field: every saved session once loaded as defaults.
- Write a raw struct to a blob.
</constraints>

## Check
The `no-raw-struct-blob` check refuses a raw struct written to a blob.
