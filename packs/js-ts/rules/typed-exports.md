---
# concepts: ts
paths:
  - "placeholder"
---

# Explicit types on exports

## The law
Every exported function and public method declares its parameter types and return type. Inside a function, let TypeScript infer local variables.

```ts
// NO
export function formatUser(user) { return `${user.first} ${user.last}`; }

// YES
export function formatUser(user: User): string {
  return `${user.first} ${user.last}`;
}
```

Why: the export is the contract. An inferred return type silently changes when the body changes, and that breaks callers in a different file.

## Check
```js
'@typescript-eslint/explicit-module-boundary-types': 'error',
```
