---
paths:
  - "**/*.sql"
  - "**/*.prisma"
---

# A column's type says what it holds

<constraints>
Always do:
- Use `timestamptz` for a moment in time, and `timestamp` only for a wall-clock time with no zone. Prisma and Rails default to `timestamp`: say `@db.Timestamptz` or `timestamptz` yourself.
- Use `text`, with a `CHECK` where a length is a real rule.
- Use `GENERATED ALWAYS AS IDENTITY` in place of `serial`.
- Use `numeric`, or an integer count of the smallest unit, for money.

Never do:
- Use `money`, or a float for an amount.
- Use `char(n)`.
</constraints>

## Check
`pg-no-money`, `pg-no-float-money`. `checks/pg-timestamptz.json` is opt-in, through `"enable"`.
Lesson check for this rule: `pg-timestamptz`.
