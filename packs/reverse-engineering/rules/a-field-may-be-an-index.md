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
- Take the label table's stride from the display spec (17 characters by 2 lines), and resolve control-assignment and "parameter to show" fields through the same index.
- Build a name-to-index table from the code's own accessor in a script and never from its documentation: a wrong name still gives a valid index and nothing shows it.

Never do:
- Accept a field as a value because its maximum looks plausible.
</constraints>
