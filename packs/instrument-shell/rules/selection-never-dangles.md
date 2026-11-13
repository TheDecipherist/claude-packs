---
# concepts: ui, painter
paths:
  - "placeholder"
---

# A selection clears when what it points at is deleted or reshaped

A selected row, step or point that outlives its item points at nothing, or at a different item that took its index.

<constraints>
Always do:
- Hold a selection by identity, and clear it when its item is deleted, moved or its list is rebuilt.
- Show an empty selection as empty: say that nothing is selected, and disable the actions that need one.

Never do:
- Keep a selection as a bare index across an edit.
- Leave a stale selection drawn, or let an action run on it.
</constraints>
