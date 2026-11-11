---
# concepts: js
paths:
  - "placeholder"
---

# Errors are typed, thrown as Error, and never swallowed

An error that is dropped is a failure nobody sees.

<constraints>
Always do:
- Type catch variables as `unknown`, and narrow with `instanceof` before reading `.message`.
- Throw only `Error` instances (or subclasses), with context: `new Error('saveOrder failed', { cause: err })`.
- Make every `catch` block handle the error meaningfully, rethrow it with context, or log and rethrow.
- In Fastify, throw and let the error handler map the error to a response.

Never do:
- Leave a `catch` block empty, or write `.catch(() => {})` or `.catch(() => null)`.
- Throw a string or a plain object.
- Build error responses ad hoc in every handler.
</constraints>

## Check
`no-swallowed-errors` and `reject-as-catch-all-exists` refuse the fault at edit time; where errors are handled at all, see `await-handled-at-a-boundary`. Where the project has ESLint: `no-empty`, `@typescript-eslint/only-throw-error`, `@typescript-eslint/use-unknown-in-catch-callback-variable` and `prefer-promise-reject-errors`. `useUnknownInCatchVariables` comes with `strict` (see `tsconfig-strict`).
