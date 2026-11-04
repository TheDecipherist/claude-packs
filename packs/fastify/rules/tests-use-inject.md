---
# concepts: tests
---
# API tests go through Fastify's inject(), never a bound port

<constraints>
Always do:
- Build the server with `buildServer()` and call `app.inject({ method, url, payload })` in every API test, then `app.close()`.
- Cover each route's success, its validation failure and its error contract reply.

Never do:
- Call `listen()` in a test, or reach a real network service; fake the adapters.
</constraints>
