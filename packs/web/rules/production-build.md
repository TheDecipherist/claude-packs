---
# concepts: build-config, markup, styles
paths:
  - "placeholder"
---

# The production build serves from its own origin, hashed, minified, and runs once at the end

<constraints>
Always do:
- Development iterates on the dev server with hot reload; the **first** production build of a feature happens at final verification, against a freshly built and restarted prod app, because a class of bugs exists only there (CSP blocking an inline script, Secure cookies, static middleware serving the raw index, cache staleness).
- Fonts downloaded into the repo and served from the app's origin: `next/font` or `@fontsource`, woff2 only, `font-display: swap`, one critical face preloaded, old `preconnect` hints deleted.
- Runtime JS/CSS bundled or vendored; never a CDN `<script>`/`<link>` in a production page.
- Hashed filenames for every cacheable asset; CSS extracted to files, never injected by JS; chunks that always load together are one chunk; a `performance` budget that fails the build on regression.
- Modular imports (`lodash/merge`, not `lodash`); the bundle analyzer run when a heavy dependency is added.
- `preflight-build` before any deploy: it audits the **emitted** output (request count, third-party origins, hashing, size), not the config.

Never do:
- `fonts.googleapis.com`, `fonts.gstatic.com`, typekit, fontawesome CDN, bunny (`prodbuild-no-remote-fonts`).
- `unpkg`, `jsdelivr`, `cdnjs` in a shipped page (`prodbuild-no-cdn-runtime-deps`).
- `minify: false`, `mode: 'development'`, `productionBrowserSourceMaps: true` in the shipped config (`prodbuild-no-dev-flags`).
</constraints>
