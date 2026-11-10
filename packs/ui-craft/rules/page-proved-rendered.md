---
# concepts: ui-markup
paths:
  - "placeholder"
---

# A page is proved rendered, not read

Reading markup proves nothing about contrast, overflow or layout. A grep passes cleanly in exactly the failing case.

<constraints>
Always do:
- Name the gate that proves it in `.claude/layout.json`: `"gates": { "a11y": "<command>" }`, or `"none: <reason>"` to decline. `doctor` is red for UI code without one. The `prove-page` skill builds it.
- Run it on what the visitor receives: the production build, not only the dev server.
- Treat it as a floor: automated checks catch only part of accessibility, so keyboard and screen-reader passes stay by hand.

Never do:
- Call a page done from its source.
</constraints>
