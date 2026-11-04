---
name: render-stored-text
description: Use when a page shows text from a database, when markdown, code or line endings look wrong on a page, or when stored-text checks refuse a write.
---

# Build and prove the one renderer for stored text

<constraints>
Always do:
1. Look for `stored-text.*` first. If it exists, call it.
2. Otherwise create it, choosing the libraries with `latest-versions`. Next.js or React: one `<StoredText source={...} />` server component (a markdown component with sanitize and highlight plugins), so no `dangerouslySetInnerHTML` is needed. Server-rendered templates: `renderStored(text): string`, inserted with the template's explicit raw form.
3. Keep the steps in order: `text.replace(/\r\n?/g, '\n')`; markdown with raw HTML off; highlight; sanitize last, allowing the highlighter's classes and spans, and no `style`, `script` or event attribute. Links get `rel="noopener noreferrer"`, and only `http`, `https` and `mailto` survive.
4. For a tool's or terminal's output, give the renderer a second mode: a fenced plain block, where each line keeps only what follows its last `\r`.
5. Give the code block its look in the stylesheet: a highlight theme from the design tokens, `overflow-x: auto`, and `white-space: pre-wrap` for prose that keeps its breaks.
6. Prove it with one fixture row, in a test and on the rendered page:
   - `a\r\nb\rc` shows three lines and no stray character;
   - `**bold**` and a list render as markup;
   - a ```` ```ts ```` block has token spans, and a ```` ```nosuchlang ```` block is plain and escaped;
   - `<script>alert(1)</script>`, `<img src=x onerror=alert(1)>` and `[x](javascript:alert(1))` come out harmless.

Never do:
- Add a second path for "just this one page".
- Call a page done without opening it with the fixture row.
</constraints>
