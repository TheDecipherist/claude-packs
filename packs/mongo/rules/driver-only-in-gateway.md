---
# concepts: db-callers
paths:
  - "placeholder"
---

# The driver is touched in one gateway; features import functions from it

The model writes new code by imitating the imports it sees. One obvious gateway gets reused; a scattered one gets reinvented, and with it the session scoping, the id rehydration and the error mapping that the gateway was built to centralise.

<constraints>
Always do:
- Reach the database only by importing a named function from the gateway (`findSessionById`, `appendActivity`). New collection, new query shape: **a new function in the gateway**, never a driver call at the call site.
- Keep the gateway's header contract (five lines, at the top of its entry module) so whoever extends it reads the rules at that moment:
  ```ts
  // DATABASE GATEWAY: the ONLY module that touches the driver.
  // Features import query/write functions from here; no MongoClient or db.collection() anywhere else.
  // Reads are aggregation pipelines; multi-doc writes go through bulkWrite.
  // New collection => new function here. Rule: driver-only-in-gateway.
  ```
- Rehydrate at the boundary: JSON turns `ObjectId` and `Date` into strings; the gateway function takes a string id and wraps it with `new ObjectId(id)` itself.

Never do:
- `MongoClient`, `db.collection(`, `getDb()` in routes, handlers, services, UI or lifecycle code. The `driver-outside-gateway` check refuses them. The gateway's **typed scope** (`forSession(id).experiments.insertOne(...)`) is its exported surface and is fine to call; a raw `Collection` is not.
- Pass a raw `Collection` out of the gateway "just this once".
</constraints>

## Check
Lesson checks for this rule: `driver-outside-gateway`, `no-mongoose`.
