---
name: postgres-safe-migration
description: Use when writing a migration for a table that holds data, when changing a column, adding a required column, an index or a constraint, or when a pg- check refuses a migration.
---

# Change a live Postgres table (one job: the change lands, and no query waits for it)

<constraints>
Always do:
1. Find out how big the table is and how busy, or ask. A new or empty table needs none of this.
2. Find out how the migration tool leaves a transaction, before writing `CONCURRENTLY`. Each has its own way:
   | Tool | How |
   |---|---|
   | Rails | `disable_ddl_transaction!` |
   | Django | `atomic = False` |
   | Diesel | `run_in_transaction = false` in `metadata.toml` |
   | goose | `-- +goose NO TRANSACTION` |
   | dbmate | `-- migrate:up transaction:false` |
   | sqlx | `-- no-transaction` on the first line |
   | Alembic | `autocommit_block()` |
   | Knex | `exports.config = { transaction: false }` |
   | node-pg-migrate | `pgm.noTransaction()` |

   Drizzle runs every pending migration in one transaction: take the index out of its migrations and run it apart.
3. Add a required column:
   ```sql
   ALTER TABLE t ADD COLUMN owner_id bigint;              -- 1. nullable, instant
   -- 2. the code writes it, and a backfill runs in batches
   ALTER TABLE t ADD CONSTRAINT t_owner CHECK (owner_id IS NOT NULL) NOT VALID;
   ALTER TABLE t VALIDATE CONSTRAINT t_owner;             -- 3. a later transaction, no write lock
   ALTER TABLE t ALTER COLUMN owner_id SET NOT NULL;      -- 4. the valid check skips the scan
   ALTER TABLE t DROP CONSTRAINT t_owner;
   ```
4. Add a foreign key: `ADD CONSTRAINT ... NOT VALID`, then `VALIDATE CONSTRAINT` in a later transaction. In one transaction it gains nothing.
5. Add a unique constraint: `CREATE UNIQUE INDEX CONCURRENTLY`, then `ADD CONSTRAINT ... UNIQUE USING INDEX`.
6. Change a type: check first whether it rewrites. `varchar` to `text` does not. Most others do: add a new column, write both, backfill, switch reads, drop the old one.
7. A failed `CONCURRENTLY` leaves an invalid index: drop it, then build it again.
8. Set a short `lock_timeout` on a statement that takes a strong lock, and retry it.
9. Deploy the code that can read both shapes first, and drop what is old only after nothing reads it.

Never do:
- Backfill a large table in one `UPDATE`.
- Rename a column in one step while old code still runs.
- Refuse `now()` or a constant default as unsafe: since PostgreSQL 11 both are instant.
</constraints>
