---
# concepts: ts
paths:
  - "placeholder"
---

# No non-null `!` and no casting object literals

## The law
- Never use the non-null assertion `x!`. Handle the `null`/`undefined` case with a guard, or throw.
- Never cast an object literal into a type (`{...} as User`). Annotate it instead (`const u: User = {...}`) so missing fields are caught.
- `as` on anything else needs a one-line comment saying why the compiler can't see it. Prefer a Zod parse or a type guard.

```ts
// NO
const user = await findUser(id);
send(user!.email);

// YES
const user = await findUser(id);
if (!user) throw new Error(`user ${id} not found`);
send(user.email);
```

## Check
```js
'@typescript-eslint/no-non-null-assertion': 'error',
'@typescript-eslint/consistent-type-assertions': ['error',
  { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' }],
```
