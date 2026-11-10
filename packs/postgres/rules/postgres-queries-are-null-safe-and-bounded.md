---
paths:
  - "**/*.sql"
  - "**/*.ts"
  - "**/*.py"
  - "**/*.go"
  - "**/*.rs"
---

# A query survives NULLs, and reads a bounded amount

<constraints>
Always do:
- Write `NOT EXISTS` in place of `NOT IN (SELECT ...)`: one NULL in the subquery returns no rows at all.
- Page with a key (`WHERE id > $1 ORDER BY id LIMIT n`). `OFFSET` still computes every row it skips.
- Index a foreign key's referencing column when rows are looked up or deleted through it. Postgres does not do it for you.
- Name the columns a query needs in code that ships.
- Read `EXPLAIN (ANALYZE, BUFFERS)` on a query a hot path runs.

Never do:
- Run a query with no `LIMIT` on a table that grows, from a request.
- Use `BETWEEN` on a `timestamptz`: write `>=` and `<`.
</constraints>

## Check
`pg-not-exists`.
