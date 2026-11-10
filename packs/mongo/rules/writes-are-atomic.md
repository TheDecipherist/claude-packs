---
# concepts: db-gateway
paths:
  - "placeholder"
---

# A write is one atomic operation; what spans collections is a transaction

<constraints>
Always do:
- A counter is `findOneAndUpdate({ _id: key }, { $inc: { n: 1 } }, { upsert: true, returnDocument: 'after' })`, never `countDocuments() + 1` (`no-count-plus-one-ids`): two concurrent creates get the same number, and the count is wrong after the first delete.
- A conditional update puts the condition **in the filter** (`{ _id, 'budget.max_turns': { $lt: value } }`), never read → check in JS → write (`no-read-merge-write`).
- Update-and-return is one `findOneAndUpdate(..., { returnDocument: 'after' })`, not `updateOne` then `findOne` (`update-then-reread`).
- Writes to two or more collections that must succeed together run inside `session.withTransaction(...)` (the replica set is already there), and the transaction body is idempotent so a retry is safe.
- Uniqueness is a (partial) unique index: `{ name: 1 }` with `partialFilterExpression: { deleted: false }` lets a soft-deleted name be reused and still blocks live duplicates.
- Every field a query filters or sorts on is in `indexes.ts`, compound indexes start with the chain key (`session_id`), and GridFS `*.files` metadata queries are indexed too.
- Driver errors are mapped **in the gateway** to typed app errors: E11000 → `CONFLICT`, code 121 → `VALIDATION`; nobody upstream sees a `MongoServerError`.
- A changed `facts`/payload from outside is parsed with Zod before it is used (`facts-validated-by-zod`); `as GateResult[]` is not validation.

Never do:
- `insertOne`/`updateOne` inside a `for` loop (`no-db-write-in-loop`): collect ops, one `bulkWrite` (or `arrayFilters` for one document).
- `$set: { created_at: … }` on an existing document (`created-at-immutable`): add `queued_at` for re-sorting.
- `a.toHexString() === b.toHexString()` (`objectid-equals`): `a.equals(b)`.
- `while (Date.now() < deadline) { …; await sleep(150) }` against the database (`watch-not-poll`): a change stream or a `findOneAndUpdate` wake-up.
- `(await col.findOne(...))!` right after a write (`no-non-null-after-findone`): return the document from the write.
- `.find(...)` then `.filter(...)` in JS: the `$nin`/`$match` belongs in the query.
</constraints>
