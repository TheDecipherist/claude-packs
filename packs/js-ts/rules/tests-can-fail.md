---
# concepts: js
paths:
  - "placeholder"
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
