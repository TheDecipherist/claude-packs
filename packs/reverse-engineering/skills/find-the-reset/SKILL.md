---
name: find-the-reset
description: Use when a patch is loaded or recalled and state from the previous patch may leak, or when an engine needs its reset-before-apply.
---

# Find the reset (one job: map exactly what the machine's reset sets, in order, before a patch loads)

The map is what an engine's reset-before-apply copies. Related: `attribute-the-record`, `trace-the-builders`.

<constraints>
Always do:
1. Locate the reset routine from the reset vector, and the routine a patch load calls first.
2. List every parameter and state it writes, with value and order.
3. Name what it leaves untouched: that is carried state.
4. Give each entry its source tag and address with its space.

Never do:
- Reset by guess; copy the map.
</constraints>
