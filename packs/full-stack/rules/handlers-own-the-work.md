---
# concepts: handlers
---
# A handler does the work through adapters and answers in the one error contract

<constraints>
Always do:
- Take parsed, typed input (the route validated it) and return a typed result or throw an error of the one error contract.
- Reach a database or another service only through an adapter; a handler is testable with the adapters faked.

Never do:
- Import a database driver or an HTTP client in a handler.
- Build an error reply by hand (`reply.code(400).send({ ... })`); throw the contract's error and let the error handler answer.
</constraints>
