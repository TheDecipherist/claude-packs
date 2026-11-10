---
paths:
  - "**/*.ts"
  - "**/*.js"
  - "**/*.go"
---

# No role inside a tenant ever crosses one, and isolation is proved with a second tenant

<constraints>
Always do:
- Put the tenant key first in every query, taken from the session, never from the URL.
- Stamp the tenant on every message by the connection it arrived on, never from its body. In Go the same holds: the key comes from the session or the connection, never from `r.PathValue`, a query string or a decoded message.
- Keep platform administration a separate identity, not the highest tenant role.
- Prove isolation with the `prove-tenant-isolation` skill.

Never do:
- Give a self-registered account a role that reads other tenants.
- Update or delete on a slug or an `_id` alone.
</constraints>

## Check
`tenant-filter-from-url`, `role-sees-all-tenants`.
