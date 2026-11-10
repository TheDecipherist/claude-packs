---
# concepts: ui
paths:
  - "placeholder"
---

# A press is held as long as the firmware needs to see it, and a two-button gesture has its latch

A rebuild whose panel is read by the machine's own scan sees a button only while the scan finds it down. On Matrix-12 (B-67) a test pressed and released a button in one call, the firmware never saw it, and the gesture was called broken. A gesture of two buttons at once (SHIFT with another) cannot be made with one mouse at all unless the panel latches the first.

<constraints>
Always do:
- Measure the panel's timing from the firmware before writing a press: the scan period, how many scans a press must last to count, and how long the first button of a pair must be down before the second counts. Write the figures, with their `[FW]` addresses, where the gestures are listed.
- Hold every press, by mouse, touch or test, for at least that many scans of audio or ticks, with blocks run between the press and the release, never both in one call.
- Give every two-button gesture a latch for one mouse: the first press holds its button down until the second press is released, and the latch is shown on the panel while it holds.
- Test a gesture the way the app runs it: messages spread over blocks, as a player's hand would make them.

Never do:
- Press and release in one call, or in one block, and call the control or the firmware broken when nothing happens.
- Fake a two-button gesture by setting the state it leads to: that proves the state, never the gesture.
</constraints>
