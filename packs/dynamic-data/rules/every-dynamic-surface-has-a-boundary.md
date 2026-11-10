---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.mjs"
  - "**/*.cjs"
---

# Configurable is never unbounded: every dynamic surface has a declared boundary

<constraints>
Always do:
- Express conditions in one closed language: `{field, op, value}` leaves with `and`, `or`, `not`. Nothing executes, so nothing can be injected.
- Compile it to the database on the query surface, and interpret it in the UI. Use the same language for visibility, validation, guards and filters.
- Give the closed language a pressure valve: a named predicate from the registry, declared per surface.
- Allowlist collections, operations and fields, and ship the allowlist switched on.
- Validate a stored query at execution, and scope it to the tenant.
- Render templates against a declared context schema, with no code in them.

Never do:
- Run text as code: `new Function`, `eval`, or a template engine fed from stored text. Template edit rights then equal code execution.
- Build a `RegExp` from stored config.
- Take a collection name from a request.
- Filter in memory after a query: it breaks pagination and counts.
</constraints>

## Check
`no-code-from-data`, `no-template-from-stored-text`, `no-regexp-from-stored-config`, `no-collection-from-request`, `no-pipeline-from-stored-text`.
