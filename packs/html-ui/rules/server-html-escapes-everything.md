---
# concepts: ui-templates
paths:
  - "placeholder"
---

# Every value in server-rendered HTML is escaped; styling and script are never inline

<constraints>
Always do:
- One `html.ts` exports `escapeHtml`, `attr`, and a tagged template `html\`…\`` that escapes every interpolation by default; raw insertion is an explicit `raw(trustedFragment)`. There is **one** `escapeHtml` in the project (`no-duplicate-escape`).
- Enum values from the database (`session.state`, `goal.status`) go through it too: today they are enums, tomorrow one is free text.
- Styling lives in one nonce'd stylesheet; an inline `style="…"` is silently dropped by the production CSP (`no-inline-style`), so dev and prod render differently.
- Client JavaScript is a static file served with the nonce or a hash in CSP, type-checked and tested; never a 50-line string inside a `.ts` template.
- External links: `rel="noopener noreferrer"` and an `https://` check on the href (`external-link-rel`).
- Polling partials render only what changed; the full page data fan-out does not run every 4 seconds per open tab.

Never do:
- `${value}` inside a template that contains `<` unless the tag escapes it.
- A second `escapeHtml` in an auth or oauth module.
- `rel="noreferrer"` alone.
</constraints>
