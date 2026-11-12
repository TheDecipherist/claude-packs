---
# concepts: js
paths:
  - "src/**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}"
  - "tests/**/*.{js,mjs,cjs,ts,tsx,mts,cts}"
  - "test/**/*.{js,mjs,cjs,ts,tsx,mts,cts}"
---

# A test imports the code it proves

<constraints>
Always do:
- Import the real module under test, and call it.
- See a new test fail with the code broken.

Never do:
- Copy the code into the test, or test a hand-made copy of the behaviour.
</constraints>

## Check
`test-imports-the-source`.
