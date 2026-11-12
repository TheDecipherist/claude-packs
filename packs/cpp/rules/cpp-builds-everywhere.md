---
paths:
  - "**/*.cpp"
  - "**/*.cc"
  - "**/*.h"
  - "**/*.hpp"
  - "**/*.mm"
  - "**/CMakeLists.txt"
  - "**/*.cmake"
---

# A project builds on every platform it claims, from a fresh clone

<constraints>
Always do:
- Make a fresh clone configure with no setup: use a local dependency if it is there, and fetch a pinned version if not.
- Build on each platform you ship for, in CI where you can. A Linux binary proves nothing on Windows.
- Build a console tool as a console app: a GUI target wants `WinMain` on Windows.
- Use fonts that exist everywhere, or ship one.
- Build with `-Wshadow`, which MSVC reports as C4456 anyway.

Never do:
- Commit a `:Zone.Identifier` file: legal on Linux, an invalid path that breaks checkout on Windows.
- Hard-code a path that exists on one machine, with no fallback.
- Rely on a compiler extension.
</constraints>

## Check
Lesson checks for this rule: `cpp-m-pi-not-standard`, `cpp-no-zero-size-array`.
