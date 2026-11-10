---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.mjs"
  - "**/*.cjs"
---

# A field is declared once, and every surface comes from that definition

<constraints>
Always do:
- Keep one definition per entity. A field has its key, label, type, owner and access there, once.
- Give a surface an overlay on that field (`grid`, `editor`, `api`, `import`) that holds what only that surface needs.
- Generate the rest from the definition: schema, validation, API, response projection, audit.
- Keep layout in pages, and semantics in the definition.
- Render an entity with no custom layout from a virtual default, made at render time. It cannot drift, and a new field always appears.
- Show a customised page's unplaced fields, so a new field is never silently missing from a form.

Never do:
- Keep two collections or files that describe the same field. Parallel `grid_fields` and `editor_fields` always drift.
- Hand-write a per-entity branch in a generic screen. A generic editor with `if (entity === 'x')` is an if-chain with extra steps.
</constraints>
