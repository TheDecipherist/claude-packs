---
# concepts: ts
paths:
  - "**/*.ts"
  - "**/*.mts"
  - "**/*.cts"
  - "**/*.tsx"
---

# String-literal unions over `enum`

Enums emit runtime code, cannot be erased by type-stripping runtimes (Node's native TypeScript support), and numeric enums accept any number.

<constraints>
Always do:
- Use a union of string literals, or an `as const` object where runtime values are also needed: `export const ROLES = ['admin', 'member'] as const; export type Role = (typeof ROLES)[number];` (and `z.enum(ROLES)` in Zod).

Never do:
- Use a TypeScript `enum`.
</constraints>

## Check
`no-ts-enum` refuses an `enum` at edit time. Where the project has ESLint: a `no-restricted-syntax` selector on `TSEnumDeclaration`, merged into any existing list, since the rule takes one array.
