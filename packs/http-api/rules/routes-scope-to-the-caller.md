---
paths:
  - "placeholder"
---

# Every route ties a record to its caller, and every guard fails closed

<constraints>
Always do:
- Put the owner in the query filter: `findSegment (id, session.user.id)`. A check after the read is one forgotten line from a leak.
- Treat authentication and authorization as two steps: who is calling, then may they touch this record.
- Write a guard so that an empty list, a missing secret and an unset variable all deny.
- Decide a role in one guard module, used by every route.
- Keep one table of actions and the roles that may run them, enforced where the action runs.
- Prove each control through the real app: a test that goes through the composition root and sees it refuse.

Never do:
- Load a record by a client-supplied id with no tie to the caller.
- Write `if (ids.length > 0 && !ids.includes(x))`: an empty list lets everyone through.
- Read a role, an owner or a tenant from the request body.
- Ship a debug route, or leave a security off-switch in code.
- Leave a `TODO` where a gate belongs.
</constraints>

## Check
`route-scopes-to-the-caller`, `guard-fails-open`, `role-checked-in-one-guard`, `gate-is-not-a-todo`, `no-security-off-switch`, `debug-route-not-shipped`, `middleware-skips-without-user`, `cors-needs-origin`, `authz-from-request-body`, `queue-action-from-client`.
