---
# concepts: cpp, python, go, rust, js
paths:
  - "placeholder"
---

# Write every line of the code: never leave a placeholder for the rest

Source with `// rest of code` in it compiles and loses the code it stood for.

<constraints>
Always do:
- Write the whole function, file or change.
- Lock the count of deliverables and cross-check it before replying.

Never do:
- Write `// rest of code`, `// ... existing code`, `// similar to above`, `// implement here` or a line that is only `...`.
- Write "for brevity", "the rest follows the same pattern", "similarly for the remaining" or "I'll leave that as an exercise" in place of the work.
</constraints>

## Check
`no-elided-code` refuses a write that adds one.
