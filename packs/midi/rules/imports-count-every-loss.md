---
# concepts: cpp, js, python, tooling
paths:
  - "placeholder"
---

# An import counts every loss, and the wire is not the storage

<constraints>
Always do:
- Count and print each lossy step of an import. Refuse overflow, and say why a result is empty.
- Check every UI range holds every corpus value.
- Treat a controller's edit semantics as separate from the stored byte.
- Print one report row shape per field: field, status (mapped, approximated, clamped, lost), asked and given.
- Prove a numbering by its values: a name match is not a numbering match.
- Make bank generators and loaders fail on an unknown key, never skip it.
- Test a published spec against firmware and the corpus.
- Read a stored switch where the machine has one (glide on or off) and infer from an amount only where it has none, and count each inference.
- Count each field the importer invented or defaulted as a row with status `invented`, beside mapped, approximated, clamped and lost.
- Count an ambiguous match (the best tier has several candidates) and never link it.

Never do:
- Clamp a value in silence: 383 of 433 clamped once, and nothing said so.
</constraints>
