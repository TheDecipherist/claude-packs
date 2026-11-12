---
# concepts: js
paths:
  - "src/**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}"
  - "tests/**/*.{js,mjs,cjs,ts,tsx,mts,cts}"
  - "test/**/*.{js,mjs,cjs,ts,tsx,mts,cts}"
---

# Independent async work runs in parallel

Awaits that do not depend on each other cost a round trip each when run in sequence.

<constraints>
Always do:
- Start awaits that do not depend on each other together with `Promise.all`, or `Promise.allSettled` when partial failure is acceptable: `const [user, orders] = await Promise.all([getUser(id), getOrders(id)])`.
- Use a bounded-concurrency helper on purpose where order matters or a rate limit applies, and say so in a comment.
- Use one `bulkWrite` for many MongoDB writes.

Never do:
- `await` inside a loop over independent items.
- Run N parallel `insertOne` calls where one `bulkWrite` would do.
</constraints>

## Check
Where the project has ESLint: `no-await-in-loop`.
