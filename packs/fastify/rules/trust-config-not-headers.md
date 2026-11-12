---
# concepts: routes
paths:
  - "placeholder"
---

# Origin, protocol and cookie flags come from config, never from request headers

`Host`, `x-forwarded-proto` and `x-forwarded-host` are client-controlled unless the proxy strips and sets them. Building an OAuth issuer, a redirect or a cookie flag from them hands the attacker the discovery document.

<constraints>
Always do:
- `PUBLIC_URL` in the env schema is the only source for issuer, endpoints, absolute redirects and the `resource` claim.
- `secure: env.PUBLIC_URL.startsWith('https')`, not a header. Session cookies use the `__Host-` prefix (`path: '/'`, `secure`, no `domain`), `httpOnly`, `sameSite: 'lax'` or `'strict'`.
- Proxy awareness through Fastify's `trustProxy` option configured from env, then `request.protocol`/`request.hostname`; never raw `headers['x-forwarded-*']` in route code.
- Parse `body`, `query`, `params` with the entity's Zod schema (`safeParse` → 400); the same schema the schemas module exports. A cast or `String(body.x)` is not validation (`no-cast-at-route-boundary`).
- User-uploaded bytes are served with `Content-Disposition: attachment` or an allow-listed `Content-Type`; a stored `text/html`/`image/svg+xml` served inline on the app origin is stored XSS (`user-bytes-need-disposition`).
- One `preHandler` loads the session/auth context onto `request`; routes never repeat the load-and-redirect block.

Never do:
- `headers.host`, `headers['x-forwarded-proto']`, `headers['x-forwarded-host']` outside the config/proxy module (`origin-from-config-not-host`).
- `setCookie('session', …)` without the `__Host-` prefix (`cookie-host-prefix`).
- `req.body as { … }`, `req.query as …`, `Number(query.page)`.
</constraints>

## Check
Lesson checks for this rule: `cookie-host-prefix`, `no-cast-at-route-boundary`, `origin-from-config-not-host`, `user-bytes-need-disposition`.
