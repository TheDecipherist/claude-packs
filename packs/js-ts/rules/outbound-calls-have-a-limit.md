---
# concepts: js
paths:
  - "placeholder"
---

# Every outbound call has a deadline, and a server stops cleanly

<constraints>
Always do:
- Pass `signal: AbortSignal.timeout(ms)` to `fetch`, and a timeout to every client.
- Give the work the deadline, so it stops when the wait does.
- Await `server.close()` before exit.

Never do:
- Use `Promise.race` as a timeout: it ends the wait, not the work.
</constraints>

## Check
`fetch-needs-timeout`, `race-leaves-work-running`, `server-close-awaited`.
