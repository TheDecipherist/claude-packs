---
# concepts: plan, notes
paths:
  - "placeholder"
---

# A gate opens, names and counts what it measures, so it cannot pass on nothing

A compare of defaults against defaults scored 0 disagreements on 292 empty records. A gate over a set of files passed with zero files loaded. A gate that measures nothing is green for ever.

<constraints>
Always do:
- Open the generated artefact the gate judges, and load its data outright.
- Assert the identity and the count of what was measured first, exact, per set ("264 of 264 loaded") before any verdict.
- Fail a "skipped" gate when the data it needs exists.
- Keep at least one gate that compares two independently generated artefacts, or one artefact against the world, never a record of itself.
- Make a planted fault's target id exist, and show the fault changes the output; diff string names against the id list.
- Mark a gate that tests the shell, not the unit. Every behaviour a unit owns keeps its own probe of the unit.
- Make a verdict made of several parts name the part that failed.

Never do:
- Pass on an empty set, a zero count or a file that did not load.
- Compare defaults against defaults, or a generated file against the generator's own record of it.
</constraints>
