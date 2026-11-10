---
# concepts: ts
paths:
  - "placeholder"
---

# Every promise is awaited, returned or explicitly voided

## The law
A promise that is neither awaited, returned, nor handled is a silent failure: its rejection is lost and the code after it runs before it finishes. If fire-and-forget is truly intended, write `void task().catch(log)` so the intent is visible.

Never pass an async function where a sync callback is expected (`forEach`, event emitters, `setTimeout`), because its rejections vanish.

```ts
// NO
users.forEach(async (u) => await notify(u));
saveAudit(entry);

// YES
await Promise.all(users.map((u) => notify(u)));
await saveAudit(entry);
```

## Check
**Enforced:** the `async-callback-unguarded` lesson check refuses an `async` function passed to a timer, an event handler or `forEach` (wrap it in `guarded(…)`, see `await-handled-at-a-boundary`). A promise that is simply not awaited needs types to see, so that part is ESLint's.

Needs type-aware linting (`parserOptions.projectService: true`):
```js
'@typescript-eslint/no-floating-promises': 'error',
'@typescript-eslint/no-misused-promises': 'error',
```
