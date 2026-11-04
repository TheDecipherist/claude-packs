---
# concepts: ts
paths:
  - "placeholder"
---

# No `any`

## The law
Never type anything as `any`. Use `unknown` for data you don't control yet, then narrow it (Zod parse, `instanceof`, type guard). Use a generic when the type depends on the caller.

```ts
// NO
function handle(data: any) { return data.id; }

// YES
function handle(data: unknown) {
  const { id } = IdSchema.parse(data);
  return id;
}
```

## Exceptions
- Third-party type gaps: wrap the untyped call once in a typed adapter, put the single `any` there, and add an eslint-disable comment that gives the reason.

## Check
```js
'@typescript-eslint/no-explicit-any': 'error',
'@typescript-eslint/no-unsafe-assignment': 'error',
'@typescript-eslint/no-unsafe-member-access': 'error',
```

## Enforced
`.claude/checks/no-any.json` refuses new `: any`, `as any`, `<any>`, `any[]` and `Record<…, any>` in TypeScript (tests and `.d.ts` excepted).
