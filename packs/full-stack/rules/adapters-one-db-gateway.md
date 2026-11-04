---
# concepts: adapters
---
# One database gateway: every query goes through it, chain keys first

<constraints>
Always do:
- Keep exactly one module that imports the database driver (the gateway, in `api/src/adapters/`); every other adapter calls it.
- Put the chain keys (the tenancy scope: the account, organisation or tenant a record belongs to) on top of every query in the gateway, before any filter a caller passes, so no code path can leave them out; lead every index with them.
- Map driver errors to the one error contract in the gateway.

Never do:
- Import the driver anywhere else, or let a caller build a query that sets or omits a chain key.
- Open a connection per request; the gateway holds one client.
</constraints>
