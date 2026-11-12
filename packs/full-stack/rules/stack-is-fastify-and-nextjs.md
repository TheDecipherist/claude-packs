---
# concepts: api, core, channel, manifests
paths:
  - "placeholder"
---

# The stack is Fastify and Next.js. Never Express, never Vite.

<constraints>
Always do:
- HTTP servers and APIs: **Fastify** (current major, `latest-versions`). Web apps: **Next.js**. Bundling is Next's; tests run on `node:test` or the project's existing runner.
- Check the current versions of every dependency with `latest-versions` before adding one, with its row in `docs/versions.md`.
- Export a `buildServer()` that returns the Fastify instance without listening; only the entry file listens.

Never do:
- Import, depend on or mention `express` or `vite` in code or comments (`stack-guard`, `no-express-no-vite`). A stale "ported from Express" comment is how the next Express import gets in.
- `await import('node:…')` of a built-in in a hot path: built-ins are static imports.
- A `.ts` source line over 200 characters (`line-under-200-chars`): a 1,100-character tool description belongs in a `descriptions.ts` table.
- Base64 blobs in source (`no-inline-binary`): assets are files served as files.
</constraints>

## Check
Lesson check for this rule: `no-express-no-vite`.
