---
# concepts: audio
paths:
  - "placeholder"
---

# The audio thread never allocates, locks, waits or does I/O

<constraints>
Always do:
- Allocate every buffer, delay line, voice and table in `prepareToPlay()` (or the constructor), sized for the worst case.
- Treat everything `processBlock()` calls (`renderNextBlock`, voice code, `processSample`, effect `process`) as audio-thread code too.
- Mark audio-thread functions outside the standard names with `[[clang::nonblocking]]`, so both the hook and RealtimeSanitizer cover them.
- Write `// rt-ok: <reason>` at the end of a line that is a deliberate, safe exception (e.g. `setSize(..., avoidReallocating = true)` within reserved capacity).

Never do (inside audio-thread code):
- `new`, `delete`, `malloc`, `free`, `make_unique`, `make_shared` (placement `new (ptr) T` is fine).
- Container growth: `push_back`, `emplace_back`, `insert`, `resize`, `reserve`, `assign`.
- Locks or waits: `ScopedLock`, `CriticalSection`, `std::mutex`, `lock_guard`, `unique_lock`, `scoped_lock`, condition variables, `sleep`.
- I/O or logging: `File`, streams, `fopen`, `DBG`, `std::cout`, `printf`, `Logger`.
- Building strings: `juce::String`, `std::string`, `std::to_string`.
- `throw`.
</constraints>

## Check
- **Hook (blocks the edit):** `.claude/hooks/realtime-guard.mjs` scans the bodies of `processBlock`, `processBlockBypassed`, `renderNextBlock`, `processSample` and every `[[clang::nonblocking]]` function. It blocks only violations the edit *adds*, so existing code doesn't stall unrelated work.
- **Runtime (catches what grep can't, such as allocations inside called functions):** build a debug standalone with Clang's RealtimeSanitizer (`-fsanitize=realtime`, LLVM 20+). It aborts with a stack trace on any allocation or lock inside a `nonblocking` function. Xcode's Apple clang does not support it, so on macOS use Homebrew LLVM for that debug build (or the rtsan standalone library, which its authors describe as fragile).
