---
# concepts: js
paths:
  - "src/**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}"
  - "tests/**/*.{js,mjs,cjs,ts,tsx,mts,cts}"
  - "test/**/*.{js,mjs,cjs,ts,tsx,mts,cts}"
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
