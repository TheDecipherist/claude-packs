---
paths:
  - "**/*.ts"
  - "**/*.js"
---

# No role inside a tenant ever crosses one, and isolation is proved with a second tenant

<constraints>
Always do:
- Put the tenant key first in every query, taken from the session, never from the URL.
- Keep platform administration a separate identity, not the highest tenant role.
- Prove isolation with the `prove-tenant-isolation` skill.

Never do:
- Give a self-registered account a role that reads other tenants.
- Update or delete on a slug or an `_id` alone.
</constraints>

## Check
`tenant-filter-from-url`, `role-sees-all-tenants`.
