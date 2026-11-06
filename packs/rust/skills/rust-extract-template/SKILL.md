---
name: rust-extract-template
description: Use when template-law refuses Rust code, when scan lists repeated Rust, or when copying a Rust function, impl or module to change it.
---

# Extract a Rust repeat into one template (one job: pick the Rust form, and move every copy to it)

Follow `make-it-a-template`. This skill is its Rust forms.

<constraints>
Always do:
1. A repeated block: one function, with what differs as parameters. A difference in behaviour is a closure parameter.
2. The same code over several types: a generic with a trait bound.
   ```rust
   fn total<T: Priced>(items: &[T]) -> u64 {
       items.iter().map(Priced::price).sum()
   }
   ```
3. The same method on many types: a trait with a default method.
4. The same `impl` written for many types: one `macro_rules!`, and only when a generic cannot do it.
   ```rust
   macro_rules! impl_id { ($($t:ident),*) => { $(impl Id for $t { fn raw(&self) -> u64 { self.0 } })* } }
   impl_id!(UserId, OrderId);
   ```
5. One call with other arguments: a `const` table and one loop.
6. Fields that travel together: a struct, with `#[derive(...)]` in place of hand-written impls.
7. The same code in two crates: move it to the crate both depend on.
8. Run what the change reaches: `cargo test -p <crate>`. Then search for the old names: none is left.

Never do:
- Write a macro where a function or a generic does the job.
- Add a trait with one implementor.
</constraints>
