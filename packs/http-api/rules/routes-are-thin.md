---
# concepts: routes
paths:
  - "placeholder"
---

# A route is thin: it names the path, its schemas and its handler, nothing else

<constraints>
Always do:
- Give every route its method, its path, the request and response schemas it imports, and one handler call.
- Put the route's work (rules, decisions, calls to adapters) in its handler.

Never do:
- Query a database, call another service or hold business rules in a route file.
- Write a schema in a route: import it.
</constraints>
