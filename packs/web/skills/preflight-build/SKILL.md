---
name: preflight-build
description: Use when a web app's production build, deploy, image publish or release is about to run, or when asked if the build is production-ready. Runs the real build and audits the output; findings block.
---

# Preflight a web build (one job: prove the actual production build against the production-build rule)

One thing: prove the **actual** production build against the `production-build` rule. Configs can lie; the emitted output cannot.

<constraints>
Always do:
1. **Detect**: the bundler or framework CLI (next, webpack, rollup, esbuild, none), the real production build command from `scripts` (never invented), the output directory. Announce all three. No web build → say so and stop; do not pretend to have checked.
2. **Config audit**: the `prodbuild-*` lesson checks against every config file; Next: no `productionBrowserSourceMaps`, no disabled minification; webpack: `mode: 'production'`, `[contenthash]`, `output.clean`, `splitChunks { chunks: 'all' }`, CSS extracted (never `style-loader`), a `performance` budget, `devtool: 'source-map'` never `eval`. Build identity: a per-build version linked to a commit; its absence is advisory on the first preflight and a blocker once the project has ever deployed.
3. **Build for real**: run the command. A failing build is a hard stop; report the error verbatim.
4. **Output audit**: parse the entry HTML; count every request it triggers and list them; grep the emitted HTML/CSS/JS for third-party origins (a font host or runtime CDN is a blocker); every cacheable asset carries a content hash and the HTML references the hashed names; CSS is in files; total JS/CSS/image bytes (gzip) and the five largest assets against the budget; a full-resolution PNG hero is a blocker; run the bundle analyzer if it is already a dependency and report duplicates.
5. **Fix** what is fixable (self-host the font, vendor the CDN file, add the hash, compress the image), rebuild, re-audit.
6. **Gate**: blockers remaining → the deploy does not happen. Report: the three detected facts, the request count and origin list, the size table, each finding with its evidence and its fix.
7. **Page hygiene**: no `href="#"` link, no `alert()`, a 404 page, a favicon.

Never do:
- Audit the source instead of `dist/`/`.next/`.
- Add a dependency just to get stats.
- Downgrade a blocker to a note because the deploy is wanted today.
</constraints>
