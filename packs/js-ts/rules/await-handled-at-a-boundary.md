---
# concepts: js
paths:
  - "placeholder"
---

# Every await is handled somewhere on purpose: at a boundary, for cleanup, or to recover

A `try/catch` around every `await` is not the goal. One that only logs and rethrows doubles every log line, and one that returns `null` hides the failure. The goal is that **no rejection is ever unhandled**, and that each one is handled **in the one place that can do something about it**.

<constraints>
Always do:
- **Boundaries with no catcher of their own get a `try/catch` that logs with context and ends the unit of work cleanly:**
  - `setTimeout`, `setInterval` and `setImmediate` callbacks;
  - event handlers (`.on`, `.once`, `addEventListener`, stream and socket events);
  - queue and change-stream consumers, cron jobs, MCP tool handlers (check what your SDK version does with a throw), CLI `main()`.
  Wrap these with the project's `guarded(fn, log, what)` helper in `lib/guarded.ts`, which is the only place that writes that `try/catch`.
- **Boundaries that do catch** stay thin: Fastify route handlers just `await` and `throw`. Fastify's error handler (`setErrorHandler`) maps the error to a response and logs it once.
- **A resource that must be released** (a session, a lock, a file handle, a Mongo transaction, a Chrome) gets `try { … } finally { release }`, or `await using` when the resource supports it.
- **An operation you can actually recover from** (retry, fallback, a default for a missing optional) catches **only the error it can recover from**, narrowed with `instanceof` or a code, and rethrows everything else.
- **The process has a last line:** the entrypoint registers `process.on('unhandledRejection')` and `process.on('uncaughtException')`, which log with pino and exit non-zero, so a missed rejection is loud, never silent.

Never do:
- Pass an `async` function where nobody awaits it (`setInterval(async …)`, `emitter.on('x', async …)`, `arr.forEach(async …)`). The `async-callback-unguarded` check refuses it; wrap it in `guarded(…)`.
- Swallow: an empty `catch {}`, `.catch(() => {})`, `.catch(() => null)`. The `no-swallowed-errors` check refuses them.
- Wrap an await in `try/catch` only to log and rethrow. The boundary logs it.
</constraints>

```ts
// lib/guarded.ts: the one place a "log and carry on" catch is written
export function guarded<A extends unknown[]>(fn: (...a: A) => Promise<unknown>, log: Logger, what: string) {
  return (...a: A): void => {
    let pending: Promise<unknown>;
    try { pending = fn(...a); }                       // a sync throw before the first await
    catch (err: unknown) { log.error({ err, what }, 'background task failed'); return; }
    pending.catch((err: unknown) => log.error({ err, what }, 'background task failed'));
  };
}
export function exitOnUnhandled(log: Logger): void {  // call once, in the entrypoint
  for (const ev of ['unhandledRejection', 'uncaughtException'] as const)
    process.on(ev, (err: unknown) => { log.error({ err }, ev); process.exit(1); });
}

// NO: a rejection here is unhandled and, since Node 15, kills the process
setInterval(async () => { await sweepExpired(db); }, 60_000);

// YES
setInterval(guarded(() => sweepExpired(db), log, 'sweep expired sessions'), 60_000);

// Cleanup, not catching
const session = client.startSession();
try { await session.withTransaction(() => moveFunds(session, from, to, amount)); }
finally { await session.endSession(); }

// Recover from one thing only
try { return await cache.get(key); }
catch (err: unknown) {
  if (err instanceof CacheUnavailableError) return await loadFromDb(key);
  throw err;
}
```

## Checks
- `async-callback-unguarded`: an `async` function passed to a timer, an event handler or `forEach`.
- `no-swallowed-errors`: an empty `catch`, `.catch(() => {})`, `.catch(() => null | undefined)`.
- `no-floating-promises` (type-aware ESLint) catches the rest, which a regex can't see. Wire it into the edit hook where the project has ESLint.
