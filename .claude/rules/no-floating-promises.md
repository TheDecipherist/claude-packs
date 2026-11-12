---
# concepts: ts
paths:
  - "**/*.ts"
  - "**/*.mts"
  - "**/*.cts"
  - "**/*.tsx"
---

# Every promise is awaited, returned or explicitly voided

A promise that is neither awaited, returned nor handled is a silent failure: its rejection is lost and the code after it runs before it finishes.

<constraints>
Always do:
- Await, return or handle every promise.
- Write `void task().catch(log)` where fire-and-forget is truly intended, so the intent is visible.
- Use `await Promise.all(users.map((u) => notify(u)))` for a batch.

Never do:
- Pass an async function where a sync callback is expected (`forEach`, event emitters, `setTimeout`): its rejections vanish.
- Leave `saveAudit(entry);` un-awaited.
</constraints>

## Check
`async-callback-unguarded` refuses an `async` function passed to a timer, an event handler or `forEach` (wrap it in `guarded(…)`, see `await-handled-at-a-boundary`). A promise that is simply not awaited needs types to see, so that part is ESLint's, with type-aware linting (`parserOptions.projectService: true`): `@typescript-eslint/no-floating-promises` and `no-misused-promises`.
