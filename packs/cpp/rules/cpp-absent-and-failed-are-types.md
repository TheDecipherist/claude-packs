---
# concepts: cpp
paths:
  - "placeholder"
---

# "Maybe absent" and "may fail" are in the type

<constraints>
Always do:
- Say "maybe absent" with `std::optional`, or a named index type, in new code.
- Mark a function whose result says whether it worked `[[nodiscard]]`, and return `std::expected` or a result type where the caller must decide.
- Parse text with `std::from_chars`, and handle what it returns.
- Check every write that matters, and close files through RAII.
- Build tests with standard library hardening on.

Never do:
- Use `-1` as "none" in new code, or index with it.
- Let a cast to `size_t` stand in for a bounds check.
- Open a file with no `else`: a failed save is lost silently.
</constraints>

## Check
`cpp-no-atoi`, `cpp-no-unchecked-fwrite`, `cpp-hardened-test-build`.
