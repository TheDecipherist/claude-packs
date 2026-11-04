---
# concepts: routes, fastify-app
paths:
  - "placeholder"
---

# Three layers, one direction: routes → handlers → adapters

<constraints>
Always do:
- Routes (`app.ts`, `routes/**`, Next's `app/api/**/route.ts`) are thin: parse and validate the request with the entity schema, call one handler, return its result. Request-in, handler-call, response-out, nothing else.
- Handlers (`handlers/**`, one file per domain) hold the business logic and orchestration; they call adapters for anything external and never reach outside the process themselves.
- Adapters (`adapters/**`, the database gateway, external API clients, queues) wrap everything external; the Mongo gateway is the one place driver code lives (`mongo` pack).
- All API routes live under `/api/v1/` from the first line; no unversioned route "for now" (`api-routes-versioned`).
- A service owns its domain and is reached through its interface; shared code is hoisted to a shared package, never imported sideways from a sibling's internals.

Never do:
- A database call, `fetch` to an external API, or business logic inline in a route file (`no-db-in-route-file`).
- A handler that imports the driver or an HTTP client directly.
</constraints>
