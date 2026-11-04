---
name: prove-page
description: Use when a project has UI code and no page gate, when doctor asks for gates.a11y, or when a page needs proof before it ships.
---

# Build the gate that proves a page, rendered

<constraints>
Always do:
1. Use the test runner the project has. Playwright is the usual one: pin it through `latest-versions`, with `@axe-core/playwright` for accessibility.
2. Open each key page in a real browser, on the production build, at three widths: 1440, 768 and 390.
3. Assert, per page and width:
   - no axe violations at the WCAG A and AA levels, in both colour schemes;
   - no horizontal overflow, and no text clipped or covered;
   - headlines at two lines or fewer, and a single `h1`;
   - no broken images, no uncaught script errors, and text visible at rest.
4. Seed a planted fault for each kind and see the gate red before trusting it (`hooks-and-gates`).
5. Name the command in `.claude/layout.json` as `"gates": { "a11y": "<command>" }`.

Never do:
- Run it only on the dev server: minifiers and bundlers change what ships.
- Treat a pass as "accessible": automated checks catch only part of it. Keyboard and screen-reader passes stay by hand.
</constraints>
