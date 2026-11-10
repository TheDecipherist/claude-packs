---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.mjs"
  - "**/*.cjs"
---

# A definition is data, and it is validated on every save

<constraints>
Always do:
- Validate every definition against a meta-schema when it is saved: the schema of a definition.
- Hold platform entities in static schemas, and compile domain schemas from definitions at run time, cached.
- Stamp each compiled artifact and each write's audit record with the definition version it was made under, and check that version before commit, so drift between processes is seen.
- Check references both ways: a page that names a missing field fails on save, and a definition that renames a field used by a page fails or warns on save.
- Resolve widgets, blocks, providers and hooks through a registry by name. An unknown name throws.
- Let every producer of definitions (a person, a scaffolder, an agent) emit the same validated document.

Never do:
- Ship a definition language with no schema: `defaultSort` and `defaultSorts` in two shapes is what that looks like.
- Invent a second config language for one idea.
</constraints>
