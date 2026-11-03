---
# concepts: copy-trees
paths:
  - ".claude/layout.json"
---

# Copy trees: copied, pinned, read-only

A copy tree is a folder of kind `"copy"` in `.claude/layout.json`: another project's code, copied unchanged and proved
identical (the `copy-and-prove` skill). This rule loads in every copy tree and in `layout.json`, where one is declared.

<constraints>
Always do:
- Treat every file here as a copy of another project's file at a named commit. It changes only through the project's copy tools (`guards.copy.tools` in `layout.json`): from its source, unchanged, or as a pinned change the user said yes to and null tests proved.
- Give every file its origin before it comes in (repo, path, commit, SHA-256, licence row). The licence row in `docs/licences.md` comes first.
- Prove the copy before anything uses it: the source's own render fingerprinted, the copy IDENTICAL, one coefficient changed in the copy seen DIFFERENT.
- Fix the code that uses the copy. If the copy itself must change, ask the user and pin the change.
- Start a new copy tree only in `.claude/layout.json`, as a folder with `"kind": "copy"`. The guard, this rule and the checks then cover it with no other change.
- Change a file that measured identical only after it is promoted out of the copy tree into the project's own code (a folder of kind `"own"`), with its origin record kept.

Never do:
- Edit, write, move or delete a file here by hand or by shell. The `protect-vendor` hook refuses it; only git and the sanctioned copy tools get through.
- Put a file here without its origin.
- Copy hardware, brand or machine names into anything that reaches the product: a program name, a label, a string in the binary.
</constraints>
