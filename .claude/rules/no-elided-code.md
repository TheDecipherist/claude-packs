---
# concepts: plan, notes
paths:
  - "build.md"
  - "**/build.md"
  - "bugs.md"
  - "workflow-bugs.md"
  - "**/known-issues*.md"
  - "docs/**/*.md"
---

# Write every line of the code: never leave a placeholder for the rest

Source with `// rest of code` in it compiles and loses the code it stood for.

<constraints>
Always do:
- Write the whole function, file or change.

Never do:
- Write `// rest of code`, `// ... existing code`, `// similar to above`, `// implement here` or a line that is only `...`.
</constraints>

## Check
`no-elided-code` refuses a write that adds one.
