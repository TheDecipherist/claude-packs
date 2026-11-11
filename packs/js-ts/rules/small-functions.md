---
# concepts: js
paths:
  - "placeholder"
---

# Functions stay under 50 lines

A function does one thing and fits on one screen.

<constraints>
Always do:
- Keep a function at 50 lines or fewer, blanks and comments excluded.
- Extract the named steps into their own functions when it grows past that.
- Split a React component whose body is mostly JSX into subcomponents, rather than raising the limit.

Never do:
- Raise the limit to fit a function. Test files are the exception: a `describe` block is a function.
</constraints>

## Check
Where the project has ESLint: `max-lines-per-function` at 50, blank lines and comments skipped, off for test files.
