---
paths:
  - "**/*.html"
  - "**/*.md"
  - "**/*.mdx"
  - "**/*.tsx"
  - "**/*.ts"
  - "**/*.js"
---

# Every public page has a complete head

<constraints>
Always do:
- Give every public page a unique `<title>`, a `description`, a `canonical` link, Open Graph tags with an image, and `lang` on `<html>`.
- Add structured data (`application/ld+json`) for articles.
- Build the head from one template, fed by the page's own data.
- Keep admin and preview pages out of search with `noindex`.

Never do:
- Copy a head from page to page by hand.
- Ship a page with no canonical link: duplicates then compete with each other.
</constraints>

## Check
`page-head-complete`.
