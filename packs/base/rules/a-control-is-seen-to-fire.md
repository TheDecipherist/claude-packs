---
# concepts: cpp, js, tests
paths:
  - "placeholder"
---

# A control is seen to fire, and a test can fail for the reason that matters

<constraints>
Always do:
- Prove a control (a guard, an audit log, a limiter) through the real path, and see it refuse.
- Make a mock return what the real function returns.
- Keep one test per data layer against the real store.
- Fail a test when its setup failed.

Never do:
- Return success from a stub, or leave `// for now` in front of `success: true`.
- Declare a security dependency and never use it.
- Skip a test because an earlier step made nothing.
</constraints>

## Check
`stub-reports-success`, `test-skip-on-failed-setup`.
