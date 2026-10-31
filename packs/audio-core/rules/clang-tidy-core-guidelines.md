---
# concepts: cpp
paths:
  - "placeholder"
---

# General C++ hygiene is checked by clang-tidy, not by memory

<constraints>
Always do:
- Keep the `.clang-tidy` from this pack at the repo root and run it on your own sources in CI and before merging (`run-clang-tidy -p build -header-filter='^(Source|src)/'`). Export `compile_commands.json` from CMake.
- Fix what it reports: C-style casts, narrowing conversions, `NULL`/`0` as a pointer, missing `override`, implicit single-argument constructors, Rule of Zero/Five violations, `using namespace` in headers, copying range-for loops, by-value parameters that should be `const&`, `std::move` that blocks return-value elision.
- Mark leaf classes `final`.

Never do:
- Apply general C++ advice on locking, `shared_ptr` or exceptions to audio-thread code. The realtime rules win there (`audio-thread-realtime-safe.md`).
- Run clang-tidy on JUCE's own modules or `JuceLibraryCode`.
</constraints>

## Check
`run-clang-tidy` with `WarningsAsErrors: '*'` fails the build on any finding. Sources: the C++ Core Guidelines checklist (ECC cpp-coding-standards, jeffallan cpp-pro) and the efficient-code-cpp gotchas, turned into tool checks.
