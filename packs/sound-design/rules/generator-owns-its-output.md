---
# concepts: cpp, js, python, tooling
paths:
  - "placeholder"
---

# A generator removes its own stale output

A bank that a generator no longer makes stays on disk and ships beside the new one unless the generator deletes it.

<constraints>
Always do:
- Delete, in a bank or file generator, every file it wrote last run that this run did not make.
- Mark each generated file, and make a gate count the files carrying the marker that no run made.

Never do:
- Leave a stale generated file for a person to find.
- Delete a file the generator did not mark.
</constraints>
