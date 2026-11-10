---
paths:
  - ".github/workflows/**"
  - "**/CMakeLists.txt"
---

# Regenerating a generated file gives no diff

<constraints>
Always do:
- Regenerate generated headers and tables in CI, and fail on `git diff --exit-code`.

Never do:
- Trust a generated file nobody regenerates: modes once stayed clamped for weeks, with everything green.
</constraints>
