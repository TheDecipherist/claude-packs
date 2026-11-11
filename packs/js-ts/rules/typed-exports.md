---
# concepts: ts
paths:
  - "placeholder"
---

# Explicit types on exports

The export is the contract. An inferred return type silently changes when the body changes, and that breaks callers in a different file.

<constraints>
Always do:
- Declare the parameter types and the return type of every exported function and public method: `export function formatUser(user: User): string`.
- Let TypeScript infer local variables inside a function.

Never do:
- Export a function whose parameters or return type are inferred.
</constraints>

## Check
Where the project has ESLint: `@typescript-eslint/explicit-module-boundary-types`.
