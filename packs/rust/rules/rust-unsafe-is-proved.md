---
paths:
  - "**/*.rs"
---

# Every unsafe block says why it is sound

<constraints>
Always do:
- Put a `// SAFETY:` comment directly above each `unsafe` block, naming the invariant and what upholds it.
- Keep a block to one unsafe operation, and wrap it in a safe function that checks what it needs.
- Give every `unsafe fn` a `# Safety` section in its docs.
- Run `cargo miri test` on code with `unsafe`, where it can run.

Never do:
- Use `static mut`: use an atomic, `OnceLock` or a `Mutex`.
- Use `unsafe` for speed with no measurement showing the safe form is too slow.
</constraints>

## Check
`rust-unsafe-needs-safety`, `rust-static-mut`.
