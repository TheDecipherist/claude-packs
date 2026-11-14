---
# concepts: cpp, js, python, tooling
paths:
  - "placeholder"
---

# A measuring tool does not repeat unchanged work

A render, measure or export tool that starts from nothing each run turns a fix round into a full run.

<constraints>
Always do:
- Key the cache on the input's content plus the binary's hash.
- Skip what is unchanged, and render again only what changed.
- Measure only the items a fix round changed.

Never do:
- Key a cache on a file's name or time.
- Reuse a cached result after the binary changed.
</constraints>
