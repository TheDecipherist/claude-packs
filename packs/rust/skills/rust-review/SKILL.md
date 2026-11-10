---
name: rust-review
description: Use when reviewing Rust code, a Rust diff or a crate before it lands, or when asked whether Rust code is sound or idiomatic.
---

# Review Rust (one job: find what the compiler and clippy cannot)

Run the gate first, so the review spends nothing on what tools already say: `cargo fmt --check`, `cargo clippy --all-targets --all-features -- -D warnings`, `cargo test`.

<constraints>
Always do:
1. Ownership: is each `.clone()`, `Rc`, `Arc` and `RefCell` needed, or was it a way past a borrow error? Could the caller keep the value and lend it?
2. Errors: can a caller tell the failures apart? Is every `.expect` message a true invariant? Does a `?` lose what was being attempted?
3. `unsafe`: does each `SAFETY` comment name a real invariant, and does the code around it uphold that? Read the callers. Check aliasing, alignment, initialization, and that a panic in the block leaves nothing half done.
4. Concurrency: what happens when a future is dropped at each `.await`? Is state left half written? Is a channel unbounded? Is `Ordering::Relaxed` proved enough?
5. Public API: would a new field or variant break a caller (`#[non_exhaustive]`)? Is an internal type exposed? Are `Send` and `Sync` what the caller needs?
6. Numbers and text: an `as` cast that truncates, an overflow in release builds, a byte index into a `&str`.
7. Tests: does a test fail without the change? Is an error path covered, not only the happy one?
8. Report each finding with the file, the symbol and the input that breaks it. A finding you cannot give an input for is a question.

Never do:
- Report what clippy or `rustfmt` already says.
- Ask for a lifetime, a trait or a generic the code does not need.
</constraints>
