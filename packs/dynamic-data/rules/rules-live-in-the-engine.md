---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.mjs"
  - "**/*.cjs"
---

# The engine enforces, and the UI only reflects

<constraints>
Always do:
- Keep one write path, so audit, policies and validation cannot be skipped.
- Check every write against the role's writable paths on the server. Reject with the offending paths named.
- Evaluate permissions per request, from current definitions.
- Require the tenant scope as an argument of the data gateway, so no query can leave it out.
- Run the same validation in the UI for instant feedback, from the same schema. It is never the gate.
- Audit every write, with the actor chain: a hook's change names the user and the hook.

Never do:
- Enforce a permission or a required field only in the browser.
- Snapshot permissions at login: a revoked right survives until logout.
- Silently strip a disallowed field. Rejecting keeps the user's intent visible.
- Accept the whole request body on a generic save.
</constraints>

## Check
`save-takes-named-paths`, `guard-does-its-job`.
