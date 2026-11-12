---
# concepts: tsconfig
paths:
  - "**/tsconfig*.json"
---

# tsconfig is strict and stays strict

A loosened flag turns a compile error into a run-time bug.

<constraints>
Always do:
- Keep `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `noImplicitOverride` set to `true` in every tsconfig.
- Fix the code to make an error go away.

Never do:
- Loosen one of these flags to make an error go away.
</constraints>

## Check
`tsconfig-flags` refuses an edit that turns one off. To judge the effective config (this handles `extends` and comments), run `npx tsc --showConfig -p tsconfig.json` and assert the four flags are `true`; exit code 2 makes a Claude Code PostToolUse hook block and report it.
