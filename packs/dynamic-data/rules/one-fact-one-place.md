---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.mjs"
  - "**/*.cjs"
---

# A fact is stored once, and what is derived is never stored beside it

<constraints>
Always do:
- Store the source, and treat compiled output as a cache keyed by content.
- Keep computed values in a reserved namespace on outgoing objects, so a reader can tell stored from derived.
- Derive URLs from stable fields, and keep a ledger of renames so old URLs still resolve.
- Key everything on immutable ids.
- Project every response through an allowlist of fields.
- Store a design token reference, so a retheme restyles everything. Flag a raw value as off-theme.

Never do:
- Persist editor state in content: selection, open panels, icons.
- Store a model and its compiled output side by side.
- Use a display name as a tenant key or a join key: a rename orphans the data.
</constraints>

## Check
`key-is-not-a-display-name`.
