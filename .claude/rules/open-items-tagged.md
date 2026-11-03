---
# concepts: notes
paths:
  - "bugs.md"
  - "workflow-bugs.md"
  - "**/known-issues*.md"
  - "docs/**/*.md"
---

# Every open item says whether someone decided it

<constraints>
Always do:
- Tag every open bug, known issue or leftover with `[deferred]` (someone decided not to do it now: say who and why in one line) or `[gap]` (found and real, nobody has decided anything yet).
- When closing an item, write where it was fixed (`file:line` or commit) and the test that now guards it.

Never do:
- Leave an untagged open item. Untagged reads as `[gap]`.
- Delete an open item to make a list look clean. Close it with its fix, or keep it.
</constraints>
