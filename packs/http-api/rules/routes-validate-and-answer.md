---
paths:
  - "placeholder"
---

# Input is validated at the edge, and what goes back gives nothing away

<constraints>
Always do:
- Parse every body, query and param with a schema at the route. A cast is a promise to the compiler that nobody checked.
- Send a stable error code and log the detail on the server.
- Compare secrets in constant time.
- Fetch a user-given URL through one function that refuses private, link-local and metadata addresses, on every redirect.
- Keep one rate limiter module, with a per-account limit on anything guessable.
- Read the client IP from the proxy you trust, counted from the right of `x-forwarded-for`.
- Verify a webhook signature over the raw bytes, and record the event id so a retry does nothing.

Never do:
- Send `err.message` to the client.
- Switch the Content Security Policy off. Start strict, and allow what the page needs by name.
- Use the leftmost `x-forwarded-for` value.
</constraints>

## Check
`route-body-needs-schema`, `query-cast-is-not-validation`, `secret-compared-constant-time-any`, `user-url-through-safe-fetch`, `rate-limit-one-module`, `client-ip-not-leftmost-xff`, `err-text-stays-server-side`, `webhook-dedupes-event-id`, `server-fetches-tenant-url`, `hmac-over-reserialised-body`, `csp-not-switched-off`.
