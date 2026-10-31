---
# concepts: ui, params
paths:
  - "placeholder"
---

# One gesture is one undo step; host automation never enters undo

<constraints>
Always do:
- Call `UndoManager::beginNewTransaction()` on mouse-down only. During the drag, perform actions that coalesce on the same target (`UndoableAction::createCoalescedAction`), so a whole drag undoes in one step.
- Make a patch load either clear the undo history or be one transaction of its own.
- Tell user gestures and host automation apart: only changes made inside the editor during a gesture are undoable.

Never do:
- Create one undo step per mouse-move event.
- Record host automation or modulation (pushes, orbits) as undo actions.
</constraints>

## Check
Test: drag a moon across 500 values, undo once. Pass: the value is back exactly where it started, and the transaction holds one coalesced action.
