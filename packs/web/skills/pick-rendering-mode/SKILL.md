---
name: pick-rendering-mode
description: Use when starting or scaffolding a site or app, adding a page kind that may render differently, or deciding whether a page is static, server-rendered, client-rendered or an island. Records the decision where the build can see it.
---

# pick-rendering-mode

One thing: decide the rendering mode per page kind up front and record it, instead of drifting into client-side rendering and hand-rolled multi-page HTML.

<constraints>
Always do:
- For anything where content, SEO or first paint matters, the content is in the **initial HTML response**: SSG (build time, CDN) for marketing, docs, blog, listing pages; SSR (per request) for personalised or auth-gated content; CSR or islands only for the genuinely interactive parts and for app surfaces behind a login where SEO is irrelevant. Mix per page.
- Several pages, a shared layout, routing or real data fetching → **Next.js** (the house framework), never hand-rolled vanilla JS and never a pure client-rendered SPA for a content site.
- A single landing page or a tiny embeddable widget → plain HTML and CSS; a framework there is its own mistake.
- Record the mode in the spec and in CLAUDE.md's load-bearing section: `Rendering: SSG for /, /docs/*; SSR for /account/*; islands for the editor`. A mode that is not written down was not decided.
- The client/server boundary follows from the mode (`client-boundaries` rule): data paths for every client-side navigation target are listed in the spec's API section.

Never do:
- Default to client rendering because it is the habit.
- Leave the mode implicit, or change it per page without updating the record.
</constraints>
