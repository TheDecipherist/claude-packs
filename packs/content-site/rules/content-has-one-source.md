---
paths:
  - "**/*.html"
  - "**/*.md"
  - "**/*.mdx"
  - "**/*.tsx"
  - "**/*.ts"
  - "**/*.js"
---

# A page has one source, and what is built from it is never edited

<constraints>
Always do:
- Keep one source for each page, and generate the rest: HTML, the index, the sitemap, the feed.
- Regenerate the sitemap in the build, so a new page cannot be left out.
- Keep URLs stable. A renamed page gets a redirect, in the same change.
- Keep tutorial files and sample code in a folder scans can tell from the project's own.

Never do:
- Edit generated HTML by hand, or keep two folders with the same article under different slugs.
- Change a published URL without a redirect.
</constraints>
