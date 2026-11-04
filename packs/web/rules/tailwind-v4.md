---
# concepts: styles
paths:
  - "placeholder"
---

# Tailwind 4: borders default to currentColor, unlayered CSS beats utilities, tokens live in @theme

Training-data idiom is v3. Three v4 differences shipped real visual bugs while every DOM test stayed green.

<constraints>
Always do:
- Restore a neutral border default once, in the global stylesheet: `@layer base { *, ::after, ::before, ::backdrop, ::file-selector-button { border-color: var(--color-slate-200, #e2e8f0); } }`. Load-bearing surfaces still name their colour (`border-slate-200 dark:border-slate-700`): a bare `border`/`divide-*` draws near-black in v4.
- Custom component CSS goes in `@layer components` (or base). Unlayered author CSS beats **every** utility regardless of order or specificity; a hand-written `.app-top-bar { padding-top: … }` silently zeroes `pt-14` on the same element.
- One owner per property per element: fold the utility's value into the custom class or drop the class; never split one box's property between the two.
- Tokens (palette, fonts, radii) declared once in `@theme` so utilities exist for them. A raw hex in a page or component is the drift the schema rule kills in data (`tw-no-raw-hex-in-markup`).
- Fonts are self-hosted: `next/font` or `@fontsource`, family registered in `@theme --font-sans`; prove it with a computed-style assert, the import alone proves nothing.
- Dark mode is one decision (`prefers-color-scheme` via `dark:` or a class toggle), recorded in the global stylesheet header; every surface that sets a light colour pairs its `dark:` value in the same edit.

Never do:
- Unlayered CSS that touches a property a utility also sets on that element.
- Remote font hosts (`prodbuild-no-remote-fonts`).
</constraints>
