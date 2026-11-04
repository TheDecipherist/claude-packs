---
# concepts: db-gateway, db-scripts
paths:
  - "placeholder"
---

# A delete names what to delete, never what to keep

<constraints>
Always do:
- Count first: run the filter as a count or `$match` + `$count`, log the number, then delete. A delete whose match count surprises you was about to be an incident.
- Prefer an upsert on a stable key over a purge-and-reload: overwriting in place makes most deletes unnecessary.
- Identity in the filter, never in the body of a write (`_id` in `$set` after a JSON round-trip throws code 66).
- `_id` is an `ObjectId`. A string `_id` against an ObjectId document matches nothing, silently.
- `null` is not "missing": `{ f: null }` matches null **and** absent. Use `$exists: false` for missing.

Never do:
- `deleteMany({})` or `deleteMany()` outside test cleanup (`no-empty-deletemany` check).
- A delete filter built on a negation (`$ne`, `$nin`, `$not`) against a status or version field: it deletes everything except one value, and one wrong constant empties the store while reading as a cleanup (`no-negation-delete` check).
- `dropDatabase()` / `drop()` in application code: that is an ops runbook action with a human gate (`no-drop-in-code` check).
</constraints>
