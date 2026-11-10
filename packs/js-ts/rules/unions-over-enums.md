---
# concepts: ts
paths:
  - "placeholder"
---

# String-literal unions over `enum`

## The law
Use a union of string literals, or an `as const` object when you also need runtime values. Do not use TypeScript `enum`.

```ts
// NO
enum Role { Admin = 'admin', Member = 'member' }

// YES
export const ROLES = ['admin', 'member'] as const;
export type Role = (typeof ROLES)[number];
// Zod: z.enum(ROLES)
```

Why: enums emit runtime code, can't be erased by type-stripping runtimes (Node's native TS support), and numeric enums accept any number.

## Check
```js
'no-restricted-syntax': ['error',
  { selector: 'TSEnumDeclaration', message: 'Use a string-literal union or as-const array.' }],
```
(Merge this selector into any existing `no-restricted-syntax` list; the rule takes one array.)
