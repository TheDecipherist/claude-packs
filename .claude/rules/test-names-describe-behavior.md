---
# concepts: js-tests
paths:
  - "**/*.test.ts"
  - "**/*.test.mts"
  - "**/*.test.cts"
  - "**/*.test.tsx"
  - "**/*.spec.ts"
  - "**/*.spec.mts"
  - "**/*.spec.cts"
  - "**/*.test.js"
  - "**/*.test.mjs"
---

# Test names state the behavior; bodies are Arrange-Act-Assert

A title that names the behavior tells the next reader what broke.

<constraints>
Always do:
- Write the title as what happens under which condition: `returns 404 when the user does not exist`.
- Give the body three visible parts, arrange, act and assert, and one behavior per test.
- Fix the code, not the test, unless the test itself is wrong; say which one it is when a test changes.

Never do:
- Title a test after the function alone: `test getUser`.
</constraints>

## Check
`test-name-says-behaviour` refuses a title that names no behavior. Where the project has ESLint: `vitest/valid-title`, `vitest/expect-expect` and `vitest/no-identical-title`.
