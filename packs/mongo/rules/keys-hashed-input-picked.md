---
# concepts: js
paths:
  - "placeholder"
---

# Keys are matched by hash, and a stored document is built from named fields

<constraints>
Always do:
- Look up API keys and tokens by their hash.
- Build a stored document from the fields you name.
- Make a filter sanitiser throw on what it cannot pass: one that drops a condition widens the query.
- Put a limit on every list read.

Never do:
- Spread a request object into a write.
</constraints>

## Check
`key-lookup-is-hashed`, `no-input-spread-into-write`.
