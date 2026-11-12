---
# concepts: build
paths:
  - "placeholder"
---

# Build flags: warnings are errors, no fast-math

<constraints>
Always do:
- Build your own targets with `-Wall -Wextra -Wpedantic -Werror` (not JUCE's modules, which aren't warning-clean). Use `juce::juce_recommended_warning_flags` plus `-Werror` on your own sources.
- Keep sanitizer builds as presets: ASan + UBSan, TSan, and an RTSan debug standalone built with Homebrew LLVM 20+ (Apple clang has no RealtimeSanitizer).

Never do:
- Add `-ffast-math`, `-Ofast` or `/fp:fast`. They let the compiler assume NaN and Inf never happen, which silently deletes `isfinite` guards and breaks compensated sums.
</constraints>

## Check
- `.claude/checks/no-fast-math.json` blocks fast-math flags being added.
- `.claude/checks/keep-werror.json` blocks an edit that removes `-Werror` from a CMake file that had it.
Lesson checks for this rule: `keep-werror`, `no-fast-math`.
