---
# concepts: params
paths:
  - "placeholder"
---

# Parameters and state are safe to touch from any host thread

<constraints>
Always do:
- Assume hosts call `setValue` on parameters from background threads while audio runs, and call `getStateInformation`/`setStateInformation` off the message thread.
- Make every value shared between those paths atomic, or copy it through the lock-free handoff.

Never do:
- Change the process locale (`setlocale`, `std::locale::global`). It breaks number formatting inside the host. (`.claude/checks/no-locale-change.json` blocks it.)
</constraints>

## Check
ThreadSanitizer test: N threads set parameters and save state in a loop while the audio thread renders. Pass: no TSan reports, and `setlocale(LC_ALL, nullptr)` is unchanged after plugin init.
Lesson check for this rule: `no-locale-change`.
