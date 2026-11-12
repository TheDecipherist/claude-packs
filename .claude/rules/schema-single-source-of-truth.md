---
# concepts: schemas, handlers
paths:
  - "**/schemas/**"
  - "**/schema/**"
  - "**/*.schema.ts"
  - "**/*.schema.mts"
  - "**/*.schema.cts"
  - "**/*.schema.js"
  - "**/models/**"
  - "**/types/**"
  - "**/routes/**"
  - "**/handlers/**"
  - "**/adapters/**"
  - "**/services/**"
  - "**/controllers/**"
  - "**/app/api/**"
---

# One Zod schema per entity; everything else is derived from it

The failure this kills: the same entity declared at each layer (a frontend interface, a backend interface, a hand-written validator, a manual DB schema), kept in sync by hand, guaranteed to drift the first time a field is added.

<constraints>
Always do:
- One file per entity in the project's **one** schemas module (`src/schemas/` or a `packages/schemas` workspace), with a barrel `index.ts`. The barrel carries this header so whoever extends it reads the rule at that moment:
  ```ts
  // SCHEMAS MODULE: single source of truth for every data entity.
  // One file per entity; this barrel re-exports all. Derive types with z.infer and variants with
  // .omit/.pick/.extend. NEVER hand-write a parallel interface or declare z.object() in a route/handler/adapter.
  // New entity => new file here + export below. Rule: schema-single-source-of-truth.
  ```
- Derive, never restate: `type User = z.infer<typeof UserSchema>`; `CreateUserInput = UserSchema.omit({ _id: true, created_at: true })`; `UserResponse = UserSchema.extend({ _id: z.string() })` built by one `toWire(schema)` helper, not six hand-written response shapes.
- Parse at every boundary with the same schema: `safeParse` on `req.body`/`query`/`params` (→ 400), the form resolver on the client, the pre-write guard in the gateway, `$jsonSchema` for the collection generated from it in the deploy step.
- Every `z.string()` carries a `.max()`; every record/array of unknown size carries a bound. Unbounded input is a 16 MB document waiting to happen.
- Zod 4 top-level formats: `z.email()`, `z.uuid()`, `z.iso.datetime()`, `z.url()`. Never the deprecated `z.string().email()` family.
- Constants that bound a field (`MAX_STEPS`, a cap, an enum list) live **once**, exported from the schema file, and the validator, the renderer and the `.slice()` all import it.

Never do:
- `z.object(` in a route, handler, adapter, service or controller file. The `no-inline-zod-outside-schemas` check refuses it: declare it in the schemas module and import it, even "just for this one form".
- An `interface`/`type` that parallels a schema field-by-field.
- Merge a partial update by hand and cast the result: `Schema.parse(merged)` after the merge.
- Read Zod private internals (`schema._zod.def`) without pinning the exact Zod version and a test that walks every schema.
</constraints>

## Checks
- `no-inline-zod-outside-schemas`: `z.object(` outside the schemas module.
- `zod-string-needs-max`: a `z.string()` chain in the schemas module with no `.max(`.
- `zod-v4-formats`: `z.string().email()`, `.uuid()`, `.url()`, `.datetime()`, `.ip()` → the Zod 4 top-level form.
