---
# concepts: cpp, js, notes, tooling
paths:
  - "placeholder"
---

# Before a field is read as a value, test whether it is an index, and from which base

A field that reads absurd is often not a value: it indexes a table, or counts from a different base than the manual does. A plausible maximum is not a check.

<constraints>
Always do:
- Find the table the field could index and compare its length with the field's maximum.
- When a field reads absurd, suspect the enumeration base first: a pointer index against the manual's number, zero against one.
- Treat a stored id as the label table's index, numbered from zero, and expect it to skip menu entries.

Never do:
- Accept a field as a value because its maximum looks plausible.
</constraints>
