---
# concepts: api
---
# Health, a correlation id and the remote ip on every log line; helmet and rate-limit in production

<constraints>
Always do:
- Serve `GET /health` (no auth, no database work beyond a ping) for the orchestrator.
- Give every request a correlation id (taken from `x-request-id` or made), return it in the response header, and put it and `remote_ip` (the client's address, from the trusted proxy) in every log line of that request through the request's child logger.
- Register @fastify/helmet and @fastify/rate-limit behind one `isProd` flag read from `env.ts`.

Never do:
- Log with `console.log`, log a secret or a whole request body, or turn security plugins on and off in more than one place.
</constraints>
