---
# concepts: client
paths:
  - "placeholder"
---

# The client bundle holds no server code, no secrets, and navigates only through the router

<constraints>
Always do:
- Server-only code (the gateway, env, anything with a secret) reaches a `'use client'` component only through a server component's props, a route handler or a server action; `import type` from a server module is the one allowed import, and only under `verbatimModuleSyntax: true`.
- Browser globals (`window`, `document`, `localStorage`, `navigator`) inside effects, event handlers or behind `typeof window !== 'undefined'`; never at module scope, where the server render evaluates them.
- Internal navigation through the router (`<Link>`, `router.push`), so SPA state, prefetching and transitions survive. `window.location` only for external URLs and file downloads, marked `// allow location nav` on the line.
- Hydration data is initial-only: every client-side navigation target has its own data path (a route handler or server component fetch), or it renders stale or blank.
- Loader/props payloads are a projection shaped to what the component renders, never the service's full result: SSR embeds the data twice (HTML + hydration JSON).
- Verify once per feature that the client build contains no connection string, collection name or server env key.

Never do:
- A value import from `/server/`, `/db/`, `gateway`, `.server` in a `'use client'` file (`client-no-server-import`).
- `const x = window.…` / `document.…` at module scope (`client-no-browser-global-at-module-scope`).
- `window.location.href = '/…'`, `.assign`, `.replace`, `.reload` for an internal route (`client-no-window-location-nav`).
- An API key or `MONGODB_URI` anywhere under `app/`, `components/`, `client/`, `public/` (`client-no-api-key`).
</constraints>

## Check
Lesson checks for this rule: `client-no-api-key`, `client-no-browser-global-at-module-scope`, `client-no-server-import`, `client-no-window-location-nav`.
