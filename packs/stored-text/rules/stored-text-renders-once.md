---
# concepts: stored-text-ui, stored-text-renderer
paths:
  - "placeholder"
---

# Text from a database reaches the page through one renderer

<constraints>
Always do:
- Render every field a person or a tool wrote (a message, a note, a description, a transcript, a tool's output) through the project's one renderer, in a file named `stored-text.*` (the `render-stored-text` skill builds it).
- Keep its order: normalise line endings; parse markdown with raw HTML off; highlight fenced code by its language; sanitize last, with an allowlist.
- Normalise `\r\n` and a lone `\r` to `\n`. A terminal's output is the exception: there a lone `\r` overwrites the line, so keep what follows the last one.
- Treat a backslash and an `r` showing as text as a write bug: the value was encoded twice. Fix it where it is written, and repair the stored rows.
- Highlight on the server, so no highlighter ships to the browser. An unknown language renders as plain, escaped code; never guess one.
- Keep labels, ids and enum values plain and escaped: they are not documents. Mark such a field with a `plain text:` comment on its line when its name reads like a document.

Never do:
- Show stored text with `{row.body}` or `${esc(row.body)}`: the markdown shows as symbols and the code as one grey block.
- Put HTML on a page by `dangerouslySetInnerHTML`, `innerHTML` or `v-html` unless it is the renderer's output. Markdown can carry a script; only the sanitize step stops it.
- Import a markdown, highlight or sanitize library anywhere but the renderer.
- Normalise or strip `\r` when saving: the stored text stays as it came.
</constraints>

## Check
`stored-text-renderer-complete`, `stored-text-libs-only-in-renderer`, `no-raw-html-from-data` and `stored-text-through-renderer` (lesson checks). The last reads field names, not data flow: a field with another name gets past it, so review what a new page shows.
