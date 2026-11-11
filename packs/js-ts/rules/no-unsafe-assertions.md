---
# concepts: ts
paths:
  - "placeholder"
---

# No non-null `!` and no casting object literals

A cast tells the compiler something it cannot check, and the bug moves to run time.

<constraints>
Always do:
- Handle the `null` or `undefined` case with a guard or a throw: `if (!user) throw new Error(...)`.
- Annotate an object literal instead of casting it (`const u: User = {...}`), so missing fields are caught.
- Put a one-line comment on any other `as`, saying why the compiler cannot see it, and prefer a Zod parse or a type guard.

Never do:
- Use the non-null assertion `x!`.
- Cast an object literal into a type (`{...} as User`).
</constraints>

## Check
`no-cast-escape-hatches` refuses the fault at edit time. Where the project has ESLint: `@typescript-eslint/no-non-null-assertion` and `consistent-type-assertions` with `objectLiteralTypeAssertions: 'never'`.
