---
paths:
  - "**/*.ts"
  - "**/*.py"
  - "**/*.go"
  - "**/*.rs"
---

# One pool per process, in one place

<constraints>
Always do:
- Make one pool per process, in one module, and hand it to everything that needs it.
- Size it so every process together stays under `max_connections`, with room for a migration.
- Give back every client you take, on every path.
- Keep a transaction short, and do no network call inside one.

Never do:
- Open a connection per request.
- Use session state (`SET`, `LISTEN`, session advisory locks, `PREPARE`) through PgBouncer in transaction mode.
</constraints>
