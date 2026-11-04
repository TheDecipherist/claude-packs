---
# concepts: markup, pages
paths:
  - "placeholder"
---

# Performance is decided up front: first paint first, everything else deferred

<constraints>
Always do:
- Split: critical (above the fold) in the initial HTML with inlined critical CSS, the LCP image preloaded with `fetchpriority="high"`, one critical font preloaded. Everything else deferred: `loading="lazy"` on below-fold images and iframes, `defer`/`async` scripts, dynamic imports for offscreen components, analytics late.
- Reserve space: `width` and `height` on every image (`wp-img-needs-dimensions`), `aspect-ratio` for backgrounds, `font-display` with a size-adjusted fallback. CLS is mostly "the space was not reserved".
- Images as WebP/AVIF through `<picture>` (or `next/image`), with `srcset` + `sizes`; vector stays SVG; animated GIFs become video; a full-resolution PNG hero is the most common single perf bug.
- Fonts self-hosted, subset, two weights not four.
- Less JavaScript: built-ins and small deps, route-level code splitting, nothing blocking first paint or interaction on analytics.
- A Core Web Vitals budget (LCP, CLS, INP) set at the start; Lighthouse for the lab number, field data for the truth.

Never do:
- `loading="lazy"` or `fetchpriority="low"` on the hero/LCP element (`wp-hero-not-lazy`).
- A `<script>` in `<head>` without `defer`.
</constraints>
