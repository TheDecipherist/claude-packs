---
name: publish-a-page
description: Use when adding or renaming an article, a blog post or a public page.
---

# Publish a page (one job: it is found, it loads fast, and old links still work)

<constraints>
Always do:
1. Write the source, and build the page from it. Never edit the built HTML.
2. Check the head: title, description, canonical, Open Graph image, structured data.
3. Size and compress every image.
4. Run the build, so the index, the sitemap and the feed include it.
5. For a rename, add the redirect in the same change.
6. Open the page at phone width, and read it once as a stranger.
7. Run the `humanize` skill on the text.

Never do:
- Publish with a placeholder image or description.
- Reuse a slug for different content.
</constraints>
