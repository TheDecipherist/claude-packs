---
# concepts: schemas
---
# Zod 4 schemas live only in the schemas folder, written once and imported everywhere

<constraints>
Always do:
- Write every request, response, record and form shape as a Zod 4 schema in `packages/core/src/schemas/`, exported, and take its type with `z.infer`.
- Give the API's routes these schemas (a Zod type provider), and the web app the same ones for its forms.

Never do:
- Write `z.object` anywhere else (`schemas-only` refuses it), or a second shape of the same thing.
- Use Zod 3 (`stack-guard` refuses it).
</constraints>
