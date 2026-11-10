---
# concepts: handlers
paths:
  - "placeholder"
---

# A handler does the work through adapters and answers in the one error contract

<constraints>
Always do:
- Take parsed, typed input (the route validated it), and return a typed result or throw an error of the one error contract.
- Reach a database or another service only through an adapter, so a handler can be tested with the adapters faked.

Never do:
- Import a database driver or an HTTP client in a handler.
- Build an error reply by hand: throw the contract's error, and let the one error handler answer.
</constraints>
