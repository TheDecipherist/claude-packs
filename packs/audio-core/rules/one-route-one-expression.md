---
# concepts: ui, params, panel-spec
paths:
  - "placeholder"
---

# A route two controls can express is stored once

A route that a button and a cable can both make has two ways to be on; when each keeps its own flag, the two disagree and a census that reads one misses the other.

<constraints>
Always do:
- Store the route once, whichever control made it.
- Derive each control's lit state from that one stored route.
- Let a bank census read every way a route can be made (the button and the cable), so a route made either way is counted.

Never do:
- Keep a separate flag for the button and for the cable that name the same route.
</constraints>
