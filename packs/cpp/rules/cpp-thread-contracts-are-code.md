---
# concepts: cpp
paths:
  - "placeholder"
---

# A thread rule is something the compiler or a debug run can reject, not a comment

<constraints>
Always do:
- Say which thread a function runs on with an assert at its top, in debug builds.
- Mark data behind a lock with a capability annotation (`GUARDED_BY`), and build with `-Wthread-safety` where the compiler has it.
- Keep a lock and what it guards in one class. Hand out copies, or take a callback that runs under the lock.
- Own state in an object and pass it in.

Never do:
- Return a reference to data a lock guards.
- Keep mutable state in a function-local `static` or a global: in a plugin it is shared by every instance.
- Use `volatile` for synchronisation, or a `recursive_mutex` to avoid thinking about who holds a lock.
</constraints>

## Check
`cpp-no-mutable-local-static`, `cpp-no-mutable-global`.
