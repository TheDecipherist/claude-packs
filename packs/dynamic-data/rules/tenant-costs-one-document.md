---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.mjs"
  - "**/*.cjs"
---

# A new tenant costs one document: no files, no builds

<constraints>
Always do:
- Resolve the tenant at run time, from the request.
- Hold everything a tenant is as data, with a declared override order: tenant, then platform default.
- Emit theme values as CSS custom properties at run time.
- Measure a feature by this number: anything that raises it is wrong.

Never do:
- Keep a folder or a build output per tenant.
- Put tenant names or tokens in source.
</constraints>
