---
# concepts: cpp, js
paths:
  - "src/**/*.cpp"
  - "src/**/*.h"
  - "src/**/*.hpp"
  - "src/**/*.mm"
  - "tests/**/*.cpp"
  - "tests/**/*.h"
  - "src/**/*.{js,mjs,cjs,jsx,ts,tsx}"
  - "tests/**/*.{js,mjs,cjs,ts,tsx}"
  - "test/**/*.{js,mjs,cjs,ts,tsx}"
---

# Three ifs in a row on one object's fields: a field table and one loop

<constraints>
Always do:
- When **3 or more `if`s in a row** test fields of the same object (`args.filter?.flag`, `args.filter?.kind`, `args.filter?.path`…) to copy, map or build something, write a **field table** and **one loop**:
  - **JS/TS:** a module-scope object from field name to what to do with it, typed against the input (`satisfies Record<keyof Filter, …>`), and one `for … of Object.entries(TABLE)` that applies it. A new field is one new row.
  - **C++:** a `constexpr std::array` of `{ name, member pointer / setter }`, and one loop.
- **Validation of required fields** is the same law: a list of required keys, and one loop that names the first one missing.
- Use the schema as the table when one exists (Zod `pick`/`partial`, a Mongo filter builder), rather than a hand-written list.

Never do:
- Write `if (src.a !== undefined) dst.a = …; if (src.b !== undefined) dst.b = …; if (src.c …` one field per line. It grows by one line per field until it's fifteen.
- Hide the run by putting an unrelated line between the ifs.

`if` is still right for:
- two fields;
- fields of different objects;
- conditions on different things.
</constraints>

```ts
// NO
if (args.filter?.flag !== undefined) filter.flags = args.filter.flag;
if (args.filter?.kind !== undefined) filter.kind = args.filter.kind;
if (args.filter?.path !== undefined) filter.path = { $regex: escapeRe(args.filter.path) };

// YES: one row per field, one loop
const FILTER_FIELDS = {
  flag: (v) => ({ flags: v }),
  kind: (v) => ({ kind: v }),
  path: (v) => ({ path: { $regex: escapeRe(v) } }),
} satisfies Record<keyof NonNullable<Args['filter']>, (v: never) => Partial<Filter>>;

for (const [key, put] of Object.entries(FILTER_FIELDS)) {
  const value = args.filter?.[key];
  if (value !== undefined) Object.assign(filter, put(value));
}
```

## Check
`.claude/checks/field-map-over-if-runs.json` refuses an edit that **adds** three ifs on fields of the same object within a few lines of each other. It covers `!== undefined`, `!= null`, truthy tests, `?.`, `.` and `->`. Its companion is `lookup-over-if-chains`, for branches on one value. If a run ever slips through in a new shape, tighten the check rather than fixing the one case.
