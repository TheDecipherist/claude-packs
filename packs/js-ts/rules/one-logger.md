---
# concepts: js
paths:
  - "placeholder"
---

# One logger, configured once, with a request id on every line

"Log it" is not a standard. Without one, `console.error` satisfies every instruction and the deployment gets stderr soup with no level, no fields and no way to tie a 500 line to the response the user got.

<constraints>
Always do:
- One logger module per service (pino; Fastify's own `app.log`/`request.log` in a Fastify service) exporting a configured instance. Nothing else constructs a logger or imports the logging library.
- Structured JSON to stdout: level, timestamp, service name, request id. Stdout is what gets collected; file transports are wrong in a container.
- The request id is generated at ingress (or taken from the incoming header) and travels: every line in a request's lifetime carries it, and the 500 body returns it as the correlation id.
- Errors log under the `err` key so the stack is recorded, not only the message.
- Every suppressed-repeat path ("log once and go quiet") keeps a counter somewhere visible (a metric, a periodic re-log with the count, a health field): a subsystem broken for a week must not look like a quiet week.
- The logger never throws (`json-only-through-one-helper`): if logging fails, the request still finishes.

Never do:
- `console.*` in application code (`no-console-in-app`). Two exemptions, each marked with a comment so nobody deletes the rule: crash handlers (`uncaughtException`/`unhandledRejection`, where an async logger may not flush before exit) and pre-init boot lines that run before the logger exists.
- What a user typed at info level (query strings, form fields): attack forensics go to a dedicated level or field with retention thought through.
- A second logger instance, or a wrapper that swallows the level.
</constraints>
