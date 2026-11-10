---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.mjs"
  - "**/*.cjs"
---

# Every field has an owner, and a human edit wins over an import

<constraints>
Always do:
- Declare each field's owner: a user, the system, or an integration by name. Lock what an integration owns.
- Set a `touched` latch when a human edits. An import stops updating that record or field until the latch is cleared, and the latch is visible.
- Show who last changed a value.
- Let a hook run with system authority, and record the actor chain.

Never do:
- Let a nightly sync overwrite a human's edit.
- Let two systems both think they own one field.
</constraints>
