---
# concepts: js
paths:
  - "placeholder"
---

# Errors are typed, thrown as Error, and never swallowed

## The law
- Catch variables are `unknown`; narrow with `instanceof` before reading `.message`.
- Throw only `Error` instances (or subclasses), never strings or plain objects.
- A `catch` block either handles the error meaningfully, rethrows it with context (`new Error('...', { cause: err })`), or logs and rethrows. An empty catch is never allowed.
- In Fastify, throw and let the error handler map it to a response; don't build error responses ad hoc in every handler.

```ts
try {
  await saveOrder(order);
} catch (err: unknown) {
  throw new Error(`saveOrder failed for ${order.id}`, { cause: err });
}
```

## Check
**Enforced:** the `no-swallowed-errors` lesson check refuses an empty `catch`, `.catch(() => {})` and `.catch(() => null)` at edit time. Where errors are handled at all, see `await-handled-at-a-boundary`.

ESLint, where the project has it:
```js
'no-empty': 'error',
'@typescript-eslint/only-throw-error': 'error',
'@typescript-eslint/use-unknown-in-catch-callback-variable': 'error',
'prefer-promise-reject-errors': 'error',
```
`useUnknownInCatchVariables` comes with `strict` in tsconfig (see tsconfig-strict).
