---
# concepts: ts
paths:
  - "placeholder"
---

# No `any`

`any` switches the compiler off for everything it touches.

<constraints>
Always do:
- Use `unknown` for data not yet controlled, then narrow it (a Zod parse, `instanceof`, a type guard).
- Use a generic when the type depends on the caller.
- For a third-party type gap, wrap the untyped call once in a typed adapter, put the single `any` there, and give the reason in an eslint-disable comment.

Never do:
- Type anything as `any`: `: any`, `as any`, `<any>`, `any[]`, `Record<…, any>`.
</constraints>

## Example
```ts
function handle(data: unknown) {
  const { id } = IdSchema.parse(data);
  return id;
}
```

## Check
`no-any` refuses new `any` in TypeScript at edit time (tests and `.d.ts` excepted). Where the project has ESLint: `@typescript-eslint/no-explicit-any`, `no-unsafe-assignment` and `no-unsafe-member-access`.
