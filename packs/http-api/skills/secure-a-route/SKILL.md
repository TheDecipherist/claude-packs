---
name: secure-a-route
description: Use when adding or changing an HTTP route, a webhook, or anything that reads a record by an id from a request.
---

# Secure a route (one job: this route refuses what it should, and a test saw it refuse)

<constraints>
Always do:
1. Name who may call it, and which records they own.
2. Parse the body, query and params with a schema before using them.
3. Put the owner in the query filter.
4. Write the tests through the real app, not a hand-built one: no credentials gets 401; a second account's id gets 404; bad input gets 400.
5. See each test fail with the guard removed.
6. Return a stable error code. Log the detail.
7. Add a rate limit if the route takes a code, a password or a guess.

Never do:
- Mock the guard in the test that proves the guard.
- Return a different answer for "not yours" and "not there".
</constraints>
