---
# concepts: ui, painter, panel-spec
paths:
  - "placeholder"
---

# The computer keyboard plays notes, and nothing else takes it, outside a text field the user opened

A key that does anything else steals a note; the user types a value only in a field they opened.

<constraints>
Always do:
- Put the key listener on the top-level window and return true for every plain key, or macOS plays its alert before each note; test that no alert sounds.
- Route arrow browsing through the same listener, returning false for keys it does not own.
- Open a hosted editor as an overlay, never a window, so the keyboard stays live.

Never do:
- Let a control take a plain key outside a text field the user opened.
</constraints>
