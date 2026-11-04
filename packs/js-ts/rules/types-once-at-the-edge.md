---
# concepts: js
paths:
  - "placeholder"
---

# A shared type is declared once, not cast at each use

<constraints>
Always do:
- Declare the session, the user and the request context once, with module augmentation or one typed accessor.

Never do:
- Repeat `as { user: ... }` at every use.
</constraints>

## Check
`session-user-typed-once`.
