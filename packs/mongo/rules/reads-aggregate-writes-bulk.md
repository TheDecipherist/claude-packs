---
# concepts: db-gateway, db-scripts
paths:
  - "placeholder"
---

# Reads shape and bound in the database; multi-document writes are one bulkWrite

<constraints>
Always do:
- Read with `.aggregate([{ $match }, { $sort }, { $limit }, { $project }])`: the shaping happens in the database and the pipeline is data you can log, test and compose. `Array.prototype.find` on a plain array is fine; `collection.find()` is not.
- Paginate by keyset: `$match: { sortKey: { $gt: last }, ... }` on an indexed sort with `_id` as tie-breaker. `$skip` rescans everything before the page.
- Build the ops in the loop, run **one** `bulkWrite` after it. Never a database call inside a loop.
- Make writes idempotent (stable keys, set-to-value over blind `$inc`) so a retry is safe. After a partial `bulkWrite` failure retry only the failed ops (`writeErrors[].index`).
- Upsert is `updateOne(filter, { $set, $setOnInsert }, { upsert: true })` paired with a unique index. Uniqueness is the index, never check-then-insert: the race window is real traffic.
- Independent queries go in one `Promise.all` (`parallel-independent-awaits`).
- `createIndex` runs in a deploy or startup step, never in request code.
- Count with `estimatedDocumentCount` for "roughly how many"; `countDocuments` only when a filter demands it.

Never do:
- An unbounded `collection.find(` (`no-find-reads` check): a `find` with `.sort()` or `.limit()` in the database is fine; anything that joins or reshapes is a pipeline. Add `// mongo: allow find` with the reason for the rare exception.
- `insertMany` / `updateMany` / `deleteMany` as the multi-document write path (`bulk-over-many` check). `deleteMany` stays for test cleanup.
- `$skip` for pagination; an unanchored `$regex` (it forces a collection scan; anchor with `^`).
- `findOne` then `insertOne` as a uniqueness check.
</constraints>
