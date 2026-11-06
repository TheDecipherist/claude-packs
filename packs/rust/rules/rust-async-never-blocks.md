---
paths:
  - "**/*.rs"
---

# An async function never blocks its thread

<constraints>
Always do:
- Hand blocking work to `spawn_blocking`, or use the runtime's own `fs`, `process` and `time`.
- Drop a `std::sync` guard before an `.await`. Use the runtime's own mutex when the lock must span one.
- Give every spawned task a way to stop, and a place its error lands.

Never do:
- Call `std::thread::sleep`, `std::fs` or `std::process::Command` in an `async fn`.
- Hold a lock across `.await`: clippy's `await_holding_lock` reads this, and the gate holds it.
</constraints>

## Check
`rust-blocking-in-async`.
