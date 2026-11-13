---
# concepts: audio, params
paths:
  - "placeholder"
---

# A pool's cap, its grid and its counter type are one number, and overflow is refused aloud

A pool whose cap is written in three places holds three limits, and the smallest one wins silently.

<constraints>
Always do:
- Declare the cap once, and derive the grid size, the arrays and the counter's type from it. The counter's type holds the cap with room.
- Refuse an overflow where it happens, say so in the UI or the log, and keep the pool intact.

Never do:
- Write the same limit as a literal in two places.
- Drop an item past the cap without saying so.
</constraints>
