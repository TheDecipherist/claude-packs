---
paths:
  - "**/*.sql"
  - "**/migrations/**"
  - "**/migrate/**"
  - "**/*.prisma"
---

# A migration never stops traffic

A new table is free. A live table is not: a lock held for one long statement queues every query behind it.

<constraints>
Always do:
- On a live table, build an index with `CONCURRENTLY`, outside a transaction. Check how the migration tool leaves its transaction first.
- Add a foreign key or a check `NOT VALID`, then `VALIDATE` it in a later transaction.
- Add a required column in three steps: nullable, backfill in batches, then tighten. The `postgres-safe-migration` skill walks it.
- Change a column by expand and contract: a new column, both written, a backfill, then the old one dropped.
- Set `lock_timeout` on a migration that takes a strong lock.

Never do:
- Add a column with a volatile default (`gen_random_uuid()`, `clock_timestamp()`, `random()`, `nextval()`) to a live table. `now()` and a constant are safe.
- Add a `NOT NULL` column with no default to a table with rows.
- Run a wipe (`prisma migrate reset`, `db push --force-reset`, `drizzle-kit push --force`, `db:drop`, `flush`, `dropdb`) on anything but a local database. `db-wipe-guard` refuses it.
</constraints>

## Check
`pg-no-volatile-default`, `pg-no-required-column`, `pg-concurrently-in-txn`, and the hook `db-wipe-guard`. On a project with large live tables, name these in `"enable"`: `checks/pg-index-concurrently.json`, `checks/pg-fk-not-valid.json`. A line that is right anyway says so at its end: `-- pg: allow <reason>`.
