---
# concepts: fastify-app
paths:
  - "placeholder"
---

# Helmet and rate limits are registered unconditionally

A staging or dev deploy reachable on the network has the same login form as production. Security that keys off `NODE_ENV` is security that is off wherever someone forgot the variable.

<constraints>
Always do:
- `@fastify/helmet` and `@fastify/rate-limit` registered on every start, with the same settings in every environment. Per-route tighter limits on `/login`, `/oauth/*`, anything that mints a token.
- `/health` does not hit the database per request: cache the last ping for a few seconds, and rate-limit the route. An unauthenticated route that costs an Atlas round trip is free amplification.
- A cap on concurrent streams per client (SSE connections, change streams opened by `wait_*` tools). A looping tab must not exhaust cursors.
- The one error contract: one `setErrorHandler`, one `setNotFoundHandler`, one body shape `{ error: { code, message, correlation_id } }`; no route builds its own 404 body (`one-error-body` check).

Never do:
- `if (prod) { register(helmet) }` or any security plugin behind `NODE_ENV` (`security-not-behind-node-env`).
- Logic that differs between prod and dev except the log level and the listen address.
</constraints>
