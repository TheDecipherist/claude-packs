---
paths:
  - "**/*.rs"
---

# An error is returned; a panic states why it cannot happen

<constraints>
Always do:
- Return `Result` from anything that can fail, and pass it up with `?`.
- Give a library its own error type, by hand or with `thiserror`, so a caller can match on it.
- In an application, use `anyhow` with `.context(...)` saying what was being attempted.
- Write `.expect("why this cannot fail")` for a true invariant. The message is the proof.

Never do:
- `.unwrap()` in library code. Tests, `main.rs` and `src/bin/` may.
- Return `Result<T, String>` or `Box<dyn Error>` from a public function.
- Drop a `Result` with `let _ =` on a state change.
</constraints>

## Check
`rust-unwrap-in-library`, `rust-string-as-error`.
