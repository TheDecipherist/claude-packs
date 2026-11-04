---
# concepts: routes
---
# A route is thin: it names the path, its schemas and its handler, nothing else

<constraints>
Always do:
- Give every route its method, path, the request and response schemas imported from the schemas folder, and one handler call.
- Put the route's work (rules, decisions, calls to adapters) in its handler under `api/src/handlers/`.

Never do:
- Query a database, call another service or hold business rules in a route file.
- Write a schema in a route (`schemas-only` refuses it): import it.
</constraints>
