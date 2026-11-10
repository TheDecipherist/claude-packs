---
# concepts: cpp, js, tests, python, go, rust
paths:
  - "src/**/*.cpp"
  - "src/**/*.h"
  - "src/**/*.hpp"
  - "src/**/*.mm"
  - "tests/**/*.cpp"
  - "tests/**/*.h"
  - "packs/**/*.cpp"
  - "packs/**/*.h"
  - "src/**/*.{js,mjs,cjs,jsx,ts,tsx}"
  - "tests/**/*.{js,mjs,cjs,ts,tsx}"
  - "test/**/*.{js,mjs,cjs,ts,tsx}"
  - "test/**"
---

# A control is seen to fire, and a test can fail for the reason that matters

<constraints>
Always do:
- Prove a control (a guard, an audit log, a limiter) through the real path, and see it refuse.
- Make a mock return what the real function returns.
- Keep one test per data layer against the real store.
- Fail a test when its setup failed.
- Break every check on purpose, and write to the state you inject: an injection that passes means dead code or a missing check.
- Establish which artefact you are looking at before diagnosing: check the binary's time and the server's age.

Never do:
- Return success from a stub, or leave `// for now` in front of `success: true`.
- Declare a security dependency and never use it.
- Skip a test because an earlier step made nothing.
- Let a check recompute its own subject: it holds by construction.
- Leave a local workaround with no test that fails the day upstream is fixed.
</constraints>

## Check
`stub-reports-success`, `test-skip-on-failed-setup`.
