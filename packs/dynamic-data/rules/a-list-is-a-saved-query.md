---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.mjs"
  - "**/*.cjs"
---

# A list, a filter, a chart and a dashboard tile are one saved query

<constraints>
Always do:
- Make the filter UI edit an expression tree. Ad-hoc filter state is an unsaved query.
- Make a saved view a named query, with a column set and a page size.
- Point lists, charts, tiles and page blocks at the same named query.
- Build the list destination first: it is what people live in.
- Serve filter suggestions from indexed, tenant-scoped, limited queries.

Never do:
- Make a second filter language for one surface.
- Scan a whole collection with `distinct` for suggestions.
</constraints>
