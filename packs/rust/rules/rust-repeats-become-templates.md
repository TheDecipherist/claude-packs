---
paths:
  - "**/*.rs"
---

# Anything repeated in Rust becomes one template: pick the form that fits the repeat

<constraints>
Always do:
- Match the repeat to its form. The `rust-extract-template` skill has each with an example:
  - A block with other names: one function, with what differs as parameters.
  - The same code over several types: a generic with a trait bound.
  - The same method on many types: a trait with a default method.
  - The same `impl` for many types, where a generic cannot do it: one `macro_rules!`.
  - One call repeated with other arguments: a `const` table and one loop.
  - The same code in two crates: the crate both depend on.
- Give an enum its own methods for what varies by variant: `state.label()`, in the enum's impl. A table of values on an enum belongs with the enum.
- Match every variant by name, so a new variant is a compile error in each place that must decide. `clippy::wildcard_enum_match_arm` holds this.
- Use `#[derive(...)]` and `thiserror`'s `#[from]` in place of hand-written impls.

Never do:
- Write `_ =>` on your own enum: it hides the next variant from the compiler.
- Write a macro where a function or a generic does the job, or a trait with one implementor.
- Treat a trait method as a copy: `from_str` on two types is the trait doing its job.
</constraints>

## Check
`template-law` refuses a copy, a near copy, a table written as calls and a function made again. `dispatch-once` refuses a second lookup table on one enum outside the enum's own file. `once-only` refuses a copy as written. `rust-if-chain-is-a-match` refuses three `==` branches on one value.
