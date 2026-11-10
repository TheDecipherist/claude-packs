---
paths:
  - "**/*.cpp"
  - "**/*.cc"
  - "**/*.h"
  - "**/*.hpp"
  - "**/*.mm"
  - "**/*.py"
  - "**/*.ts"
  - "**/*.js"
  - "**/*.mjs"
---

# An import counts every loss, and the wire is not the storage

<constraints>
Always do:
- Count and print each lossy step of an import. Refuse overflow, and say why a result is empty.
- Check every UI range holds every corpus value.
- Treat a controller's edit semantics as separate from the stored byte.
- Test a published spec against firmware and the corpus.

Never do:
- Clamp a value in silence: 383 of 433 clamped once, and nothing said so.
</constraints>
