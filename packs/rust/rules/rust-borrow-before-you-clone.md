---
paths:
  - "**/*.rs"
---

# Borrow first: a clone is a decision, never a way past the borrow checker

<constraints>
Always do:
- Take `&str`, `&[T]` and `&Path` in a parameter, and own only what is kept.
- When the borrow checker refuses, change who owns the value, or shorten the borrow.
- Use `impl Trait` or a generic before `Box<dyn Trait>`, unless the types differ at run time.
- Walk with iterators. Let lifetimes be elided where the compiler allows it.
- Give a value its own type (a newtype, an enum) in place of a bare `String` or a `bool` flag.

Never do:
- Add `.clone()`, `Rc` or `RefCell` only to make an error go away.
- Write a function again in another crate: `template-law` reads Rust. The `rust-extract-template` skill has the forms.
</constraints>
