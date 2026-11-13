---
# concepts: ui, painter
paths:
  - "placeholder"
---

# Every plugin shows which build it is, on its panel

A bug report that cannot name the build it came from cannot be reproduced: two builds of one plugin look the same until they are told apart.

<constraints>
Always do:
- Draw the build stamp on the panel, top right: the git commit count and short hash, from the build, with a `+` when the tree was dirty.
- Take the stamp from the build step (a generated header), never from a literal in source.

Never do:
- Ship a panel with no stamp, or a stamp typed by hand that outlives its commit.
- Hide the stamp behind a menu or a settings page.
</constraints>
