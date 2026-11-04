---
# concepts: cpp, build
paths:
  - "placeholder"
---

# Static analysis runs in the path of landing work, over every header

A check that is not in the path of landing work is a check that ran once.

<constraints>
Always do:
- Run `clang-tidy` on changed files before landing, and fail loudly if the tool is missing.
- Set `HeaderFilterRegex` to the project's own root, so every header is read, `include/` folders too. Test it: name a header and see a finding.
- Build with `-Wall -Wextra -Wpedantic -Wshadow -Wconversion -Wdouble-promotion -Werror`, in a preset, and keep sanitizer presets (`asan`, `ubsan`, `tsan`).
- Format with `.clang-format`: `ColumnLimit: 120`, `AllowShortBlocksOnASingleLine: Never`, `AllowShortIfStatementsOnASingleLine: Never`, `AllowShortLoopsOnASingleLine: false`.
- Turn a tidy check off only with a reason as narrow as the switch.

Never do:
- Anchor a header filter to a relative path: a compile database gives absolute ones, so it matches nothing and reports clean.
- Count a run that read no files as a pass.
</constraints>
