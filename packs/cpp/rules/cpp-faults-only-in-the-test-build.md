---
# concepts: cpp
paths:
  - "placeholder"
---

# A planted fault and a test lever compile only in the test build

<constraints>
Always do:
- Plant faults through one macro or one `constexpr` flag that is false outside the test build, so the branch is gone from the shipped binary.
- Read the environment in one place, at start-up, into one configuration object.
- Prove it with a release gate: search the shipped binary for the fault names and the test prefix.

Never do:
- Call `getenv` in product code, least of all on a hot path.
- Ship a switch that can hang the program, change its output or lift a safety limit.
</constraints>

## Check
`cpp-no-getenv-in-product`.
