---
# concepts: js
paths:
  - "placeholder"
---

# Independent async work runs in parallel

## The law
When awaits don't depend on each other, start them together with `Promise.all` (or `Promise.allSettled` when partial failure is acceptable). Never `await` inside a loop over independent items.

```ts
// NO: three round trips in sequence
const user = await getUser(id);
const orders = await getOrders(id);
const prefs = await getPrefs(id);

// YES
const [user, orders, prefs] = await Promise.all([getUser(id), getOrders(id), getPrefs(id)]);
```

## Exceptions
- Order genuinely matters, or you must rate-limit. Then use a bounded-concurrency helper on purpose, and say so in a comment.
- For many MongoDB writes, use one `bulkWrite`, not N parallel `insertOne` calls.

## Check
```js
'no-await-in-loop': 'error',
```
