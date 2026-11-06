---
paths:
  - "**/*.rs"
---

# `cargo clippy -D warnings` and `cargo fmt --check` are the gate

Clippy reads types, so what it can judge stays with it. The lesson checks stop only what is cheaper to stop at the write.

<constraints>
Always do:
- Take the lint set in `.claude/tools/rust-lints.toml` into `Cargo.toml`, and keep the installed `clippy.toml` at the root.
- Run `cargo fmt --check`, then `cargo clippy --all-targets --all-features -- -D warnings`, before landing.
- Turn a lint off with `#[expect(lint, reason = "...")]`, on the smallest item. `reason` needs Rust 1.81; on an older toolchain, disable `checks/rust-allow-needs-reason.json` in `layout.json`.
- Commit `Cargo.lock` for an application.

Never do:
- Leave `todo!()` or `dbg!()` in code that lands. `unimplemented!()` is a decision, and may stay.
- Depend on a `*` version.
</constraints>

## Check
`rust-allow-needs-reason`, `rust-stub-left-in`, `rust-wildcard-dependency`.
