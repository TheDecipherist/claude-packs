---
# concepts: entry
paths:
  - "**/server.ts"
  - "**/server.mts"
  - "**/server.cts"
  - "**/server.js"
  - "**/server.mjs"
  - "**/src/index.ts"
  - "**/src/index.mts"
  - "**/src/index.cts"
  - "**/src/index.js"
  - "**/src/main.ts"
  - "**/src/main.mts"
  - "**/src/main.cts"
  - "**/src/app.ts"
  - "**/src/app.mts"
  - "**/src/app.cts"
  - "**/index.ts"
  - "**/index.mts"
  - "**/index.cts"
  - "**/bin/**"
  - "**/worker/**/index.*"
  - "**/*.worker.ts"
  - "**/*.worker.mts"
  - "**/*.worker.cts"
  - "**/lifecycle.*"
---

# The process shuts down on purpose: server first, then the database, then exit

A service that listens must also stop. `docker stop`, Swarm, K8s and Ctrl-C send SIGTERM/SIGINT; without a handler the pool is dropped mid-query and every deploy's in-flight requests die with connection errors that read as flakiness. A crash with no handler exits uncleanly with the pool open; a crash handler that exits 0 reads as success and the dead service is never restarted.

<constraints>
Always do:
- Every entry file that calls `listen(` / `createServer(` / connects a database registers **one** `shutdown(reason, code)` and routes four events through it: `SIGTERM`, `SIGINT`, `uncaughtException`, `unhandledRejection`. The `entry-registers-shutdown` check refuses an entry file that listens without all four.
- Order inside `shutdown`: stop accepting (`await app.close()` in Fastify, which drains in-flight requests) → `await closeDb()` → other clients → `process.exit(code)`. Server **before** database, always.
- A hard timeout: `setTimeout(() => process.exit(code || 1), 10_000).unref()` at the top of `shutdown`, so a stuck connection cannot block exit forever.
- Guard against re-entry: a second signal during shutdown is ignored (`if (closing) return`).
- Crash handlers (`uncaughtException`, `unhandledRejection`) log with `console.error` (the one allowed use: the async logger may not flush before exit), run the same `shutdown`, and exit **non-zero**.
- Docker: `ENTRYPOINT`/`CMD` in exec form (a JSON array) and `init: true`, or signals never reach Node (`docker-exec-form`).

Never do:
- Async cleanup in `process.on('exit')`: the loop has already stopped; nothing awaits.
- `process.exit(0)` from a crash handler.
- Trap `SIGUSR1` (Node's debugger signal).
- A second place that closes the database or calls `process.exit` for a shutdown reason.
</constraints>

```ts
// src/lifecycle.ts, imported once by the entry file
import { closeDb } from './db/gateway.js';
export function installLifecycle(app: FastifyInstance): void {
  let closing = false;
  const shutdown = async (reason: string, code: number): Promise<void> => {
    if (closing) return;
    closing = true;
    setTimeout(() => process.exit(code || 1), 10_000).unref();   // hard stop
    app.log.info({ reason }, 'shutting down');
    try { await app.close(); } catch (err: unknown) { app.log.error({ err }, 'server close failed'); code ||= 1; }
    try { await closeDb(); } catch (err: unknown) { app.log.error({ err }, 'db close failed'); code ||= 1; }
    process.exit(code);
  };
  const run = (reason: string, code: number) => shutdown(reason, code).catch(() => process.exit(1));
  process.on('SIGTERM', () => run('SIGTERM', 0));
  process.on('SIGINT', () => run('SIGINT', 0));
  process.on('uncaughtException', (err) => { console.error('uncaughtException', err); run('uncaughtException', 1); });
  process.on('unhandledRejection', (err) => { console.error('unhandledRejection', err); run('unhandledRejection', 1); });
}
```

## Check
Lesson checks for this rule: `background-loop-needs-stop`, `entry-registers-shutdown`, `job-only-in-memory`.
