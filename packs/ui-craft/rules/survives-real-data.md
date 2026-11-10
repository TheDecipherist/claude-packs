---
# concepts: ui-markup, ui-styles
paths:
  - "placeholder"
---

# Every screen survives real data: long, empty, loading and failed

<constraints>
Always do:
- Design for short, average and very long input. Text containers truncate, clamp or wrap; a flex child that holds text gets `min-width: 0`.
- Give every list an empty state that says what goes here and offers the action that fills it.
- Show loading in the place the content will appear, and end the words with "..." or the ellipsis the design system uses.
- Say what failed and what to do next, where the person is looking: inside the block that failed, with when the data was last good and a Retry. Never a full-screen banner.
- Keep an empty section's frame and header, with one sentence spanning it. On a first run, put the first action where the data will appear.
- Load with the final layout: each value a flat bar at its real size, labels shown at once, nothing shifting when the data lands. A refresh keeps the old values and updates a freshness stamp.
- Show limits as a bar at the true ratio with both ends labelled ("12.7k of 20.0k").
- Reserve space for what arrives late, so nothing jumps.

Never do:
- Render a broken screen for an empty string or an empty array.
- Show a spinner with no end: a slow request says so, and offers a way out.
</constraints>
