---
# concepts: cpp, js, notes, tooling
paths:
  - "placeholder"
---

# Firmware stays out of git: ship facts, never bytes

<constraints>
This is a house policy, not legal advice.

Always do:
- Keep ROM images, DSP blobs, disassemblies and vendor banks out of every repo.
- Ship original code and derived facts. Regenerate a table from its formula, with a tolerance test.
- Name each small test fixture in `"guards": { "firmware": { "fixtures": ["<glob>"] } }`.
- Keep a repo that holds vendor art, manuals or banks private until the user decides the asset question, and log the decision.

Never do:
- Paste table bytes into source, not even a 128-byte curve.
- Commit a sound bank to make a test pass, unless it is a named fixture.
</constraints>

## Check
`no-rom-table-literal` refuses a long numeric table pasted into source; the `firmware-out-of-git` hook refuses staging an image.
