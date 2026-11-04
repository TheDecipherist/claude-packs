---
# concepts: api, core, channel, manifests
---
# The stack is Fastify for the API and Next.js for the web app, on the latest versions

<constraints>
Always do:
- Build the API on Fastify (its plugins: @fastify/helmet, @fastify/rate-limit, @fastify/cors) and the web app on Next.js.
- Take the latest stable version of every dependency, checked the day it is added (the `latest-versions` skill), with its row in `docs/versions.md`.
- Export a `buildServer()` that returns the Fastify instance without listening; only the entry file listens.

Never do:
- Add express or vite, import them, or install them; `stack-guard` refuses each.
- Pin a version from memory.
</constraints>
