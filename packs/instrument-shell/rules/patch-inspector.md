---
# concepts: ui, painter
paths:
  - "placeholder"
---

# A patch inspector shows the stored, live and previous value of every parameter

A patch that sounds wrong is hard to fix when the stored value, the value now and the value before the last edit cannot be seen side by side.

<constraints>
Always do:
- Offer an inspector listing, per parameter: the stored value, the live value and the previous value, with the ones that differ marked.
- Open it from a button on the panel or a modifier chord (for example Cmd or Ctrl with a letter). The computer keyboard plays notes and nothing else takes it (`keys-belong-to-the-keyboard`).
- Read the live values from the engine on every paint, not from a copy.

Never do:
- Open the inspector on a bare key: a bare key is a note.
- Show only the live value, so a stored-versus-live difference stays unseen.
</constraints>
