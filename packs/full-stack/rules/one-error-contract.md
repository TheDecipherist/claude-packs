---
# concepts: api, schemas
---
# One error contract for every failure the API returns

<constraints>
Always do:
- Define the error shape once, in the schemas folder (a code, a message, the correlation id, optional details), and the error classes that carry it.
- Answer every failure through Fastify's one error handler, which maps the contract's errors and validation errors to that shape and the right status, and logs the rest as 500 without their internals.

Never do:
- Send an error body by hand from a route or handler, or return a stack trace or a driver message to the client.
</constraints>
