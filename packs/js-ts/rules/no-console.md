---
# concepts: js
paths:
  - "placeholder"
---

# No `console.*` in application code

The app logger gives levels, structured JSON and request IDs; `console.log` gives none of them.

<constraints>
Always do:
- Log through the app logger: Fastify's built-in pino, `request.log` in handlers and `app.log` elsewhere (`request.log.info({ userId }, 'user created')`).
- Use `console` in CLI scripts and build tooling (`scripts/**`, `bin/**`), where stdout is the interface.

Never do:
- Leave a `console.log` (or any `console.*`) debugging call in application code.
</constraints>

## Check
`no-console-in-app` refuses new `console.*` calls in application code (tests, `bin/`, `scripts/`, `tools/` and CLIs excepted). Where the project has ESLint: `no-console`, off for `scripts/**` and `bin/**`.
