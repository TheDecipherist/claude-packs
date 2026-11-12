---
# concepts: routes
paths:
  - "**/routes/**/*.ts"
  - "**/routes/**/*.mts"
  - "**/routes/**/*.cts"
  - "**/server/**/*.ts"
  - "**/server/**/*.mts"
  - "**/server/**/*.cts"
  - "**/app.ts"
  - "**/app.mts"
  - "**/app.cts"
  - "**/server.ts"
  - "**/server.mts"
  - "**/server.cts"
---

# Every Fastify route declares a Zod schema

Untyped input matters for MongoDB too: an unvalidated `{ "email": { "$ne": null } }` body becomes a query operator, and Zod keeps `email` a string.

<constraints>
Always do:
- Validate each route's input (`body`, `querystring`, `params`, `headers` as needed) with Zod through Fastify's type provider, so handlers only ever see parsed data.
- Register routes only through one helper whose type requires a schema (`defineRoute({ method, url, schema, handler })`, `schema` required, not optional).
- Adjust any lint selector to the folder where the project's routes live.

Never do:
- Read `request.body` unvalidated.
- Register a route directly on `app`, `fastify` or `server` (`.get`, `.post`, `.route`), outside the helper.
</constraints>

## Check
Where the project has ESLint: `no-restricted-syntax` on a `CallExpression` whose callee is `app|fastify|server` with `get|post|put|patch|delete|route`, with the message "Register routes through defineRoute() so a schema is required."
