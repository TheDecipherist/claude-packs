---
# concepts: fastify-app
paths:
  - "placeholder"
---

# Security hardening is production machinery: one `isProd` switch, off in dev, proven by the prod gate

The owner's iron rule, from scars: helmet's CSP blocked the inline hydration script, Secure-only cookies forced a fake reverse proxy mid-development just to log in, and a login rate limiter in a hot-reload loop is self-inflicted lockout. Dev runs bare; prod runs everything; the prod-build gate is where it is verified.

<constraints>
Always do:
- **One** `if (isProd) { … }` branch at app setup mounts all of it: `@fastify/helmet` with a real CSP (nonce per request for the one inline script), HSTS when TLS terminates upstream, `nosniff`, frame protection, Secure cookies, every rate limiter. Never per-middleware sprinkles that half-apply.
- `isProd` comes from the env module (`NODE_ENV === 'production'`), and **every network-reachable deploy, staging included, runs with it on**. A staging box in dev mode has unlimited login brute force and no CSP.
- Dev keeps functional auth (login and sessions work; `cookie.secure = isProd`) and nothing else.
- Because dev never exercises the hardening, the prod-build gate (`preflight-build`, then the browser pass against the built app with zero console errors, CSP violations are console errors) is the **only** place it is verified. It is never skipped.
- `helmet` is present in the app file (`sec-headers-present`); `trustProxy` is the ingress hop count or a list, never `true` (`no-trust-proxy-true`): with `true`, `req.ip` is the leftmost `X-Forwarded-For` value and one header per request is one fresh rate-limit bucket per request.
- The rate limiter is correct on all four counts: keyed so a spoofed header cannot mint buckets; a store that survives N replicas (or a stated "one replica" decision); bounded map growth plus a global ceiling; rejections observable (a 429 logs or counts, so an attack is not a quiet week).
- Every request-path query carries a timeout (`maxTimeMS`, an `AbortSignal`) and the request has a deadline.
- `/health` does not hit the database per request; cache the last ping for a few seconds.
- A cap on concurrent streams per client (SSE connections, change streams opened by `wait_*` tools).
- One `setErrorHandler`, one `setNotFoundHandler`, one body shape `{ error: { code, message, correlation_id } }`; a 500 carries the correlation id, never `err.message` (`no-err-message-to-client`).

Never do:
- Security plugins outside the single switch, or logic that differs between prod and dev beyond the switch, the log level and the listen address.
- A source-IP check as authorization behind a proxy: `req.ip` is attacker-controlled when proxies are trusted. A real credential, or an unpublished port.
- A route that builds its own 404/400 body (`one-error-body`).
</constraints>

## Check
Lesson checks for this rule: `no-err-message-to-client`, `no-trust-proxy-true`, `one-error-body`, `sec-headers-present`.
