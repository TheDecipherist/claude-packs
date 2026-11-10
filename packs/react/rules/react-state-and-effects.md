---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
---

# A failed request says so, and a slow response never overwrites a newer one

<constraints>
Always do:
- Give every request three states on screen: loading, failed, done.
- Cancel an effect's request in its cleanup with `AbortController`, or ignore a stale response by id.
- Derive a value during render when it comes from props or state.
- Use a data library's cache where the project has one, not a `useEffect` per fetch.

Never do:
- Catch a failed request and render nothing.
- Copy props into state with an effect.
- Branch on `res.ok` with no `else`.
</constraints>

## Check
`ui-failed-fetch-says-so`, `ui-ok-branch-has-an-else`, `effect-not-for-derived-state`.
