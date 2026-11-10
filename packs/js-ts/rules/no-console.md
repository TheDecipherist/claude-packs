---
# concepts: js
paths:
  - "placeholder"
---

# No `console.*` in application code

## The law
Log through the app logger (Fastify's built-in pino: `request.log` in handlers, `app.log` elsewhere). That gives you levels, structured JSON and request IDs. Never leave `console.log` debugging behind.

```ts
// NO
console.log('user created', user.id);

// YES
request.log.info({ userId: user.id }, 'user created');
```

## Exceptions
- CLI scripts and build tooling (`scripts/**`, `bin/**`), where stdout is the interface.

## Check
```js
'no-console': 'error',
{ files: ['scripts/**', 'bin/**'], rules: { 'no-console': 'off' } },
```

## Enforced
`.claude/checks/no-console-in-app.json` refuses new `console.*` calls in application code (tests, `bin/`, `scripts/`, `tools/` and CLIs excepted).
