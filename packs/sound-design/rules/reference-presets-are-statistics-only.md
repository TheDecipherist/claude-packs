---
# concepts: preset-files, python, tooling
paths:
  - "placeholder"
---

# Other makers' presets are read for aggregates only

A row, a name or a body of another maker's preset in the repo is a copy, and a shipped one is a published copy.

<constraints>
Always do:
- Read other makers' presets in a store outside the repo and commit only the aggregates: counts, percentiles, ranges.
- Keep a generated patch's source donors as ids in the store, never as bodies.
- State n, scope and units beside every aggregate, and give no summary of a scope under 5 patches.

Never do:
- Commit or ship another maker's preset row, name or body, as data, a fixture or a test sample.
</constraints>
