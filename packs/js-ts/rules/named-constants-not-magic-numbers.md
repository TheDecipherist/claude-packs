---
# concepts: ts
paths:
  - "placeholder"
---

# Named constants, not magic numbers

A bare number hides what it means and in which unit.

<constraints>
Always do:
- Give any number with meaning (a timeout, limit, threshold, retry count, status code) a named constant that says what it is and its unit: `const RETRY_DELAY_MS = 30_000;`.

Never do:
- Write such a number inline: `setTimeout(retry, 30000)`, `if (items.length > 100)`.
</constraints>

## Check
Where the project has ESLint: `@typescript-eslint/no-magic-numbers`, ignoring -1, 0, 1 and 2, array indexes, enums, numeric literal types, readonly class properties and type indexes, off in test files; turn the core `no-magic-numbers` off when it is on.
