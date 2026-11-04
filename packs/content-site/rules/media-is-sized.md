---
paths:
  - "**/*.html"
  - "**/*.md"
  - "**/*.mdx"
  - "**/*.tsx"
  - "**/*.ts"
  - "**/*.js"
---

# Images are sized and light, and big files stay out of git

<constraints>
Always do:
- Give every image `width` and `height`, so the page does not jump.
- Lazy load what is below the fold, and serve modern formats.
- Keep large media in object storage or a release, out of the repo.

Never do:
- Commit a working screenshot or a debug dump (`repo-litter` refuses them).
</constraints>

## Check
`img-has-size`.
