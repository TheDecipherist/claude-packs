---
# concepts: ui, painter
paths:
  - "placeholder"
---

# Changing an asset format is two changes: the files and the reader

A reader that lacks the new format looks like a missing file, and the fault is chased in the wrong place.

<constraints>
Always do:
- When assets change format, change the reader in the same step as the files.
- Open one file of the new format through the reader, and show it loads, before the step is called done.

Never do:
- Convert the files and leave the reader for later.
</constraints>
