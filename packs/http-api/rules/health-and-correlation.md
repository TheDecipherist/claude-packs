---
# concepts: api
paths:
  - "placeholder"
---

# Health, a correlation id and the remote ip on every log line; security on behind one switch

<constraints>
Always do:
- Serve `GET /health` (no auth, no database work beyond a ping) for the orchestrator, with the build's version and commit.
- Give every request a correlation id (taken from `x-request-id` or made), return it in the response header, and put it and `remote_ip` (the client's address, from the trusted proxy) in every log line of that request.
- Turn on security headers and rate limits behind one flag read from the env module.

Never do:
- Log a secret or a whole request body, or turn security on and off in more than one place.
</constraints>
