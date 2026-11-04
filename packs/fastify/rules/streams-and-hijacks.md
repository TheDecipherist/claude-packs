---
# concepts: routes
paths:
  - "placeholder"
---

# A hijacked reply handles its own errors; a stream has an error listener and a stop

Once `reply.hijack()` runs, Fastify's error handler can no longer answer: a throw afterwards leaves the socket open forever. A `ServerResponse` that errors with no `'error'` listener crashes the process.

<constraints>
Always do:
- `reply.hijack()` is immediately followed by `try { … } catch { raw.end() }` (`hijack-needs-try`).
- An SSE response registers `raw.on('error', stop)` and `raw.on('close', stop)` before the first write, and `stop` closes every change stream and timer it opened (`sse-needs-error-listener`).
- Every `watch()` opened for a request is closed by that request's `stop`; cap them per client.
- Long-running loops take an `AbortSignal` and return a stop function (`background-loop-needs-stop`); `startWatchers()`'s stop handle is kept and called from `shutdown`.
- Poll with a change stream or `findOneAndUpdate` wake-ups, not `while (Date.now() < deadline) await sleep(150)` against the database (`watch-not-poll`, mongo pack).

Never do:
- `Promise.race` with a bare `setTimeout` (the loser leaks); use `AbortSignal.timeout(ms)` or `setTimeout` from `node:timers/promises` with a signal.
- An in-memory `Map` used as a session/transport store without a TTL sweep and a max size.
</constraints>
